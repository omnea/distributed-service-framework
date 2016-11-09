var logDebug = require('debug')('Omnea:SF:Service:log');
var logVerbose = require('debug')('Omnea:SF:Service:verbose');
var logError = require('debug')('Omnea:SF:Service:error');

module.exports = class Service {
	constructor(connector, messageProcess, errorMessages, config){
		this.connector = connector;
		this.config = config;
		this.name = config.name;
		this.messageProcess = messageProcess;
		this.errorMessages = errorMessages;

		this.errorCallback = null;
	}	

	start() {
		logDebug('Starting service...');

		return this.connector.connect()
		.then(() => 
			this.connector.consume(this._onMessage.bind(this))
		)
		.then(() => logDebug('Service ' + this.name + ' ready'))
		.catch(err => {
			logError("Failed on service load", err);
			throw err;
		})
		.then(() => this);
	}

	on(service, route, callback) {
		logDebug('Added route ' + service + ':' + route);
		this.messageProcess.addRoute(service, route, callback);
	}

	off(service, route, callback) {
		logDebug('Added route ' + service + ':' + route);
		this.messageProcess.removeRoute(service, route, callback);
	}

	_onMessage(packet) {
		return this.messageProcess.onMessage(packet)
		.then(messages => this._emitMessages(messages))
		.then(() => this.connector.ack(packet))
		.catch(err => this._onMessageProcessFail(packet, err));
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

		if(!err.isFatal)
			return rejection;

		return rejection
		.then(() => this.close())
		.then(() => this._callErrorHandler(err))
		.catch(logError);
	}

	stop() { //TODO: Implement "Wait for all consumed messages for finish their process"
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
