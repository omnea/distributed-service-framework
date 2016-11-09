var logDebug = require('debug')('Omnea:SF:Service:log');
var logVerbose = require('debug')('Omnea:SF:Service:verbose');
var logError = require('debug')('Omnea:SF:Service:error');
var EventEmitter = require('events').EventEmitter;

module.exports = class Service {
	constructor(connector, router, errorMessages, emitterFactory, config){
		this.connector = connector;
		this.config = config;
		this.name = config.name;
		this.router = router;
		this.errorMessages = errorMessages;
		this._createEmitter = emitterFactory;

		this.queue = null;
		this.channel = null;
		this.consumerTag = null;
		this.errorCallback = null;
	}	

	start() {
		logDebug('Starting service...');

		return this.connector.connect()
		.then(_ => this._createChannel())
		.then(_ => this._declareQueue())
		.then(_ => this._consume())
		.then(_ => logDebug('Service ' + this.name + ' ready'))
		.catch(err => {
			logError("Failed on service load", err);
			throw err;
		})
		.then(_ => this);
	}

	on(service, route, callback) {
		logDebug('Added route ' + service + ':' + route);
		this.router.add(service, route, callback);
	}

	off(service, route, callback) {
		logDebug('Added route ' + service + ':' + route);
		this.router.remove(service, route, callback);
	}

	_onMessage(packet) {
		logVerbose('New Packet received from ' + packet.fields.exchange + ':' + packet.fields.routingKey);
		var method = this.router.get(packet.fields.exchange, packet.fields.routingKey);

		if(!method)
			return;

		this._createEmitter()
		.then(emitter => {
			var promise = method(packet, emitter);

			return this._checkPromiseOnCallbackReturn(promise)
			.then(result => this._onMessageProcessSucess(packet, result, emitter))
			.then(logDebug)
			.catch(err => this._onMessageProcessFail(packet, err))
			.catch(logError);
		});
	}

	_checkPromiseOnCallbackReturn(promise) {
		if(typeof promise.then === "function")
			return promise;

		let message = this.errorMessages.callbackNotReturnPromise + promise;
		let err = new Error(message);
		
		err.close = true;

		return Promise.reject(err);
	}

	_onMessageProcessSucess(packet, result, emitter) {
		var messages = emitter.getAllMessages();
		
		for(let message of messages)
			this._emitMessage(message);

		return Promise.all(messages)
		.then(_ => this.channel.ack(packet))
		.catch(err => this._onMessageProcessFail(packet, err));
	}

	_onMessageProcessFail(packet, err) {
		logError(err);
		var rejection = this.channel.reject(packet);

		if(!err.close)
			return rejection;

		return rejection
		.then(_ => this.close())
		.then(_ => this._callErrorHandler(err))
		.catch(logError);
	}

	_emitMessage(message) {
		return this.channel.emit(this.name, message.route, message.content);
	}

	_createChannel() {
		return this.connector.channel()
		.then(channel => this.channel = channel);
	}

	_declareQueue() {
		var options = Object.assign({}, this.config.queues.service);
		return this.channel.queue(this.name + options.nameSufix, options.options)
		.then(queueName => {
			this.queue = queueName;
		});
	}

	_consume() {
		return this.channel.consume(this.queue, (packet) => this._onMessage(packet))
		.then(consumerTag => this.consumerTag = consumerTag);
	}

	_stopConsume() {
		return this.channel.cancel(this.consumerTag);
	}

	stop() { //TODO: Implement "Wait for all consumed messages for finish their process"
		return this._stopConsume()
		.then(_ => logDebug("Service stop"));
	}

	close() { //TODO: Close all the channels when 
		return this.stop()
		.then(_ => logDebug("Service normal exit"))
		.then(_ => this.channel.close())
		.then(_ => this.connector.close());
	}

	setErrorHandler(callback) {
		this.errorCallback = callback;
	}

	_callErrorHandler(err) {
		if(this.errorCallback)
			this.errorCallback(err);
	}
};
