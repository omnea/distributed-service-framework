/*
	Process for handling rejections of the main process. This process is totally independent from the main one.
	This process don't use the framework and works on a lower level.
	The idea is to maintain this process in only one or two files and with a very simple code

	The logic is:
	- Read the error queue config.
	- Declare the error queue
	- Consume messages from the error queue
	- If the message has been rejected
		- If the message has been rejected from the normal queue more than one time or if was rejected in general more than 4 times send to global error
		- 
	- If not, send to global error queue
*/
const log = require('debug')('Omnea:SF:errorHandler:log');
const logVerbose = require('debug')('Omnea:SF:errorHandler:verbose');
const logError = require('debug')('Omnea:SF:errorHandler:error');
const logGlobalError = require('debug')('Omnea:SF:errorHandler:globalError');
const amqpStart = require('./amqpConfig');

amqpStart(onMessage);

function onMessage (channel, config, message) {
	let sendToGEQ = sendToGlobalError.bind(null, channel, config, message);

	try{
		let deaths;
		try{
			deaths = getRejections(message);
		}catch(e){
			return sendToGEQ(e.message);
		}

		if(deaths.length === 0)
			return sendToGEQ('Message no rejected (possible unrouteable message): ');

		let totalRejections = deaths.reduce((total, rejection) => (rejection.count || 1) + total, 0);
		let consumeQueueName = config.getQueueName('consume');
		let normalRejections = deaths.find(rejection => rejection.queue === consumeQueueName);

		if(!normalRejections)
			return sendToGEQ('Fail to process message headers (normalRejections not found): ');

		if(!Array.isArray(normalRejections['routing-keys']))
			return sendToGEQ('Fail to process message headers (normalRejections routing-keys is not an array): ');
		
		let originalRoute = normalRejections['routing-keys'][0];

		if(typeof totalRejections !== 'number')
			return sendToGEQ('Fail to process message headers (totalRejections is not a number): ');

		if(typeof normalRejections.count !== 'number')
			return sendToGEQ('Fail to process message headers (normalRejections.count is not a number): ');

		if(normalRejections.count > 1 || totalRejections > 4)
			return sendToGEQ(`Message rejected too many times (${normalRejections.count},${totalRejections}): `);

		return requeueMessage(channel, config, message, originalRoute);
	}catch(e) {
		return sendToGEQ(e.message + '. Stack: ' + e.stack + '. ');
	}
}

function getRejections(message) {
	if(!message || !message.properties || !message.properties.headers)
		throw new Error('Bad formed message, no headers: ');

	var deaths = message.properties.headers['x-death'];

	if(!deaths)
		return [];

	if(!Array.isArray(deaths))
		throw new Error('x-death header is not an array: ');

	return deaths;
}

function sendToGlobalError(channel, config, message, reason){
	logGlobalError(reason + JSON.stringify(message));
	sentTo(channel, message, '', config.getGlobalErrorExchangeName(), reason, 'Can\'t send to global error queue: ');
}

function requeueMessage(channel, config, message, originalRoute){
	sentTo(channel, message, originalRoute, config.getExchangeName('delay'), null, 'Can\'t requeue message: ');
}

function sentTo(channel, message, originalRoute, exchangeName, reason, errorString) {
	try{
		originalRoute = originalRoute || "";
		var headers = getHeaders(message);
		if(reason)
			headers._globalErrorReason = reason;

		channel.emit(exchangeName, originalRoute, message.content, {headers})
		.then(() => channel.ack(message));
	}catch(e){
		logError(errorString, e, JSON.stringify(message));
	}
}

function getHeaders(message) {
	if(!message || !message.properties || !message.properties.headers)
		return {};
	return message.properties.headers;
}
