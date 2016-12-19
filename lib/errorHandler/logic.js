/*
	Process for handling rejections of the main process. This process is totally independent from the main one.
	This process don't use the framework and works on a lower level.

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

const REJECTIONS = require('./rejectionMessages');

exports.onMessage = onMessage;

function onMessage (channel, config, message) {
	let sendToGEQ = sendToGlobalError.bind(null, channel, config, message);

	try{
		let deaths = getRejections(message);
		let originalRoute = checkRejections(deaths, config, sendToGEQ);

		return requeueMessage(channel, config, message, originalRoute);
	}catch(e) {
		return sendToGEQ(e.message);
	}
}

function getRejections(message) {
	if(!message || !message.properties || !message.properties.headers)
		throw new Error(REJECTIONS.REASON_NO_HEADERS);

	var deaths = message.properties.headers['x-death'];

	if(!deaths)
		return [];

	return deaths;
}

function checkRejections (rejections, config, sendToGEQ) {
		if(!Array.isArray(rejections))
			throw new Error(REJECTIONS.REASON_DEATHS_NO_ARRAY);

		if(rejections.length === 0)
			throw new Error(REJECTIONS.REASON_NO_ROUTE);

		let consumeQueueName = config.getQueueName('consume');

		let totalRejections = rejections.reduce((total, rejection) => (rejection.count || 1) + total, 0);
		let normalRejections = rejections.find(rejection => rejection.queue === consumeQueueName);

		if(!normalRejections)
			throw new Error(REJECTIONS.REASON_NO_NORMAL_REJECTIONS);

		if(!Array.isArray(normalRejections['routing-keys']))
			throw new Error(REJECTIONS.REASON_NO_ROUTING_KEYS);

		if(typeof totalRejections !== 'number')
			throw new Error(REJECTIONS.REASON_CORRUPTED_TOTAL_REJECTIONS);

		if(typeof normalRejections.count !== 'number')
			throw new Error(REJECTIONS.REASON_CORRUPTED_NORMAL_REJECTION);

		if(normalRejections.count > 1 || totalRejections > 4)
			throw new Error(REJECTIONS.REASON_REJECTED_TOO_MANY_TIMES(normalRejections, totalRejections));

		let originalRoute = normalRejections['routing-keys'][0];

		if(typeof originalRoute !== 'string')
			throw new Error(REJECTIONS.REASON_NOT_FOUND_ORIGINAL_ROUTE);
		
		return originalRoute;
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
