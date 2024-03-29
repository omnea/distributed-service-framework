var logDebug = require('debug')('Omnea:SF:Service:log');
var logVerbose = require('debug')('Omnea:SF:Service:verbose');
var logError = require('debug')('Omnea:SF:Service:error');

module.exports = class Service {
	constructor(connector, messageProcess, errorMessages, messageUtils, config){
		this.connector = connector;
		this.name = config.getServiceName();
		this.messageProcess = messageProcess;
		this.errorMessages = errorMessages;
		this.messageUtils = messageUtils;

		this.errorCallback = null;
	}	

	start() {
		logDebug('Service: ' + this.name);

		this.connector.on('close', (err) => this.close());

		return this.connector.connect()
		.then(() => this.connector.consume(packet => this._onMessage(packet)))
		.then(() => logDebug('Service ' + this.name + ' ready'))
		.catch(err => {
			logError("Failed on service load", err);
			throw err;
		})
		.then(() => this);
	}

	middleware(callback, after) {
		if(after)
			return this.messageProcess.addMiddlewareAfter(callback);

		return this.messageProcess.addMiddlewareBefore(callback);
	}

	on(service, route, callback) {
		logDebug('Added route ' + service + ':' + route);
		this.messageProcess.addRoute(service, route, callback);
		return this.connector.bind(service, route);
	}

	off(service, route, callback) {
		logDebug('Added route ' + service + ':' + route);
		this.messageProcess.removeRoute(service, route, callback);
		return this.connector.unbind(service, route);
	}

	once(service, route, callback) {
		var wrapperFn = function() {
			return callback.call(null, ...arguments)
			.then((result) => {
				return this.off(service, route, wrapperFn).then(() => result);
			});
		}.bind(this);

		return this.on(service, route, wrapperFn);
	}

	instanceOn(service, route, callback) {
		logDebug('Added instance route ' + service + ':' + route);
		this.messageProcess.addRoute(service, route, callback);
		return this.connector.instanceBind(service, route);
	}

	instanceOff(service, route, callback) {
		logDebug('Added instance route ' + service + ':' + route);
		this.messageProcess.removeRoute(service, route, callback);
		return this.connector.instanceUnbind(service, route);
	}

	instanceOnce(service, route, callback) {
		var wrapperFn = function() {
			return callback.call(null, ...arguments)
			.then((result) => {
				return this.instanceOff(service, route, wrapperFn).then(() => result);
			});
		}.bind(this);

		return this.instanceOn(service, route, wrapperFn);
	}

	emit(route, message) {
		var data = this.messageUtils.fromArguments(route, message);
		return this.connector.emitMessage(data);
	}

	_onMessage(packet) {
		return this.messageProcess.onMessage(packet)
		.then(messages => this._emitMessages(messages))
		.then(() => this.connector.ack(packet))
		.catch(err => this._onMessageProcessFail(packet, err))
		.catch(logError);
	}

	_emitMessages(messagesToEmit) { 
		var messagesEmissions = [];

		for(let message of messagesToEmit)
			messagesEmissions.push(this.connector.emitMessage(message));

		return Promise.all(messagesEmissions);
	}

	_onMessageProcessFail(packet, err) {
		logError(err);
		var rejection = this.connector.reject(packet);

		if(!err || !err.isFatal)
			return rejection;

		return rejection
		.then(() => this.close())
		.then(() => this._callErrorHandler(err))
		.catch(logError);
	}

	stop() {
		return this.connector.stop()
		.then(() => logDebug("Service stop"));
	}

	close() {
		return this.connector.close()
		.then(() => logDebug("Service normal exit"));
	}

	setErrorHandler(callback) {
		this.errorCallback = callback;
	}

	_callErrorHandler(err) {
		if(this.errorCallback)
			this.errorCallback(err);
	}
};
