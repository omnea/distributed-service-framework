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
		.then(_ => 
			this.connector.consume(this._onMessage.bind(this))
		)
		.then(_ => logDebug('Service ' + this.name + ' ready'))
		.catch(err => {
			logError("Failed on service load", err);
			throw err;
		})
		.then(_ => this);
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
		.then(_ => this.connector.ack(packet))
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
		.then(_ => this.close())
		.then(_ => this._callErrorHandler(err))
		.catch(logError);
	}

	stop() { //TODO: Implement "Wait for all consumed messages for finish their process"
		return this.connector.stop()
		.then(_ => logDebug("Service stop"));
	}

	close() {
		return this.connector.close()
		.then(_ => logDebug("Service normal exit"));
	}

	setErrorHandler(callback) {
		this.errorCallback = callback;
	}

	_callErrorHandler(err) {
		if(this.errorCallback)
			this.errorCallback(err);
	}
};
