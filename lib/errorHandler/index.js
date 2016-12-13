/*
	Process for handling rejections of the main process. This process is totally independent from the main one.
	This process don't use the framework and works on a lower level.
	The idea is to maintain this process in only one file and with a very simple code

	The logic is:
	- Read the error queue config.
	- Declare the error queue
	- Consume messages from the error queue
	- If the message is the first time in the error queue, send to delay queue
	- If not, send to global error queue
*/
const log = require('debug')('Omnea:SF:errorHandler:log');
const logVerbose = require('debug')('Omnea:SF:errorHandler:verbose');
const logError = require('debug')('Omnea:SF:errorHandler:error');

const amqpStart = require('./amqpConfig');

amqpStart(onMessage);

function onMessage (channel, config, message) {
	let sendToGEQ = sendToGlobalError.bind(null, channel, config, message);

	try{
		let deaths = getXDeaths(message);

		let consumeQueueName = config.getQueueName('consume');
		let normalRejections = deaths.filter(rejection => rejection.queue === consumeQueueName);
		let totalRejections = deaths.reduce((total, rejection) => rejection.count + total, 0);
		let originalRoute = normalRejections[0]['routing-keys'][0];

		if(normalRejections > 1 || totalRejections > 4)
			return sendToGEQ('Message rejected too many times: ');

		return requeueMessage(channel, config, message, originalRoute);
	}catch(e) {
		return sendToGEQ(e.message + '. Stack: ' + e.stack + '. ');
	}
}

function getXDeaths(message) {
	if(!message || !message.properties || !message.properties.headers)
		throw new Error('Bad formed message, no headers: ');

	var deaths = message.properties.headers['x-death'];

	if(!deaths)
		throw new Error('Not death lettered message: ');

	if(!Array.isArray(deaths))
		throw new Error('x-death header is not an array: ');

	return deaths;
}

function sendToGlobalError(channel, config, message, reason){
	logError(reason + JSON.stringify(message));
	sentTo(channel, message, '', config.getGlobalErrorExchangeName(), 'Can\'t send to global error queue: ');
}

function requeueMessage(channel, config, message, originalRoute){
	sentTo(channel, message, originalRoute, config.getExchangeName('delay'), 'Can\'t requeue message: ');
}

function sentTo(channel, message, originalRoute, exchangeName, errorString) {
	try{
		originalRoute = originalRoute || "";
		channel.emit(exchangeName, originalRoute, message.content, {headers: message.properties.headers})
		.then(() => channel.ack(message));
	}catch(e){
		logError(errorString, e, JSON.stringify(message));
	}
}
