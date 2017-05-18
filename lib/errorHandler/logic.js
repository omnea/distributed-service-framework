/*
	Process for handling rejections of the main process. This process is totally independent from the main one.
	This process don't use the framework and works on a lower level.

	The logic is:
	- Read the error queue config.
	- Declare the error queue
	- Consume messages from the error queue
	- If the message has been rejected
		- If the message has been rejected from the normal queue more than one time or if was rejected in general more than 4 times send to global error
	- If not, send to delay queue
	- In case of mal formed message, send to global error queue
		- Some cases are an exeption, like havinf a falseable count in rejections (it takes like a 1)
*/

const log = require('debug')('Omnea:SF:errorHandler:log');
const logVerbose = require('debug')('Omnea:SF:errorHandler:verbose');
const logError = require('debug')('Omnea:SF:errorHandler:error');
const logGlobalError = require('debug')('Omnea:SF:errorHandler:globalError');

const MESSAGES = require('./rejectionMessages');

exports.onMessage = onMessage;

function onMessage (channel, config, message) {
	let sendToGEQ = sendToGlobalError.bind(null, channel, config, message);

	try{
		let deaths = getRejections(message);
		let originalRoute = checkRejections(deaths, config);

		return requeueMessage(channel, config, message, originalRoute);
	}catch(e) {
		return sendToGEQ(e.message);
	}
}

function getRejections(message) {
	if(!message || !message.properties)
		throw new Error(MESSAGES.REASON_BAD_FORMED);

	if(!message.properties.headers)
		throw new Error(MESSAGES.REASON_NO_HEADERS);

	var deaths = message.properties.headers['x-death'];

	if(!deaths)
		return [];

	return deaths;
}

function checkRejections (rejections, config) {
		if(!Array.isArray(rejections))
			throw new Error(MESSAGES.REASON_DEATHS_NO_ARRAY);

		if(rejections.length === 0)
			throw new Error(MESSAGES.REASON_NO_ROUTE);

		let consumeQueueName = config.getQueueName('consume');

		let totalRejections = rejections.reduce((total, rejection) => (rejection.count || 1) + total, 0);
		let normalRejection = rejections.find(rejection => rejection.queue === consumeQueueName);

		if(!normalRejection)
			throw new Error(MESSAGES.REASON_NO_NORMAL_REJECTIONS);

		if(!Array.isArray(normalRejection['routing-keys']))
			throw new Error(MESSAGES.REASON_NO_ROUTING_KEYS);

		if(typeof totalRejections !== 'number')
			throw new Error(MESSAGES.REASON_CORRUPTED_TOTAL_REJECTIONS);

		if(normalRejection.count > 1 || totalRejections > 4)
			throw new Error(MESSAGES.REASON_REJECTED_TOO_MANY_TIMES(normalRejection.count, totalRejections));

		let originalRoute = normalRejection['routing-keys'][0];

		if(typeof originalRoute !== 'string')
			throw new Error(MESSAGES.REASON_NOT_FOUND_ORIGINAL_ROUTE);

		return originalRoute;
}

function sendToGlobalError(channel, config, message, reason){
	logGlobalError(reason + JSON.stringify(message));
	let route = tryToGetRouteFromFields(message);
	sentTo(channel, message, route, config.getGlobalErrorExchangeName(), reason, 'Can\'t send to global error queue: ');
}

function requeueMessage(channel, config, message, originalRoute){
	sentTo(channel, message, originalRoute, config.getExchangeName('delay'), null, 'Can\'t requeue message: ');
}

function sentTo(channel, message, originalRoute, exchangeName, reason, errorString) {
	try{
		if(!message || typeof message !== 'object')
			message = {content: new Buffer('')};

		if(!Buffer.isBuffer(message.content))
			message.content = new Buffer('');

		originalRoute = originalRoute || "";
		var headers = getHeaders(message);
		if(reason)
			headers._globalErrorReason = reason;

		channel.emit(exchangeName, originalRoute, message.content, {headers})
		.then(() => channel.ack(message))
		.catch(e => {
			/* istanbul ignore next: We can't check properly this. We need to inject debug module in the constructor, but this is not a class D_: */
			logError(errorString, e, JSON.stringify(message));
		});
	}catch(e){
		/* istanbul ignore next : We don't found any way of making this function fail and reach this line*/
		logError(errorString, e, JSON.stringify(message));
	}
}

function getHeaders(message) {
	if(!message || !message.properties || !message.properties.headers)
		return {};
	return message.properties.headers;
}

function tryToGetRouteFromFields(message){
	if(!message || !message.fields)
		return "";

	return message.fields.routingKey;
}
