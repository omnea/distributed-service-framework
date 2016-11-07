var debug = require('debug')('Omnea:SF:Service:log');
var verbose = require('debug')('Omnea:SF:Service:verbose');
var error = require('debug')('Omnea:SF:Service:error');
var EventEmitter = require('events').EventEmitter;

module.exports = class Service extends EventEmitter {
	constructor(connector, router, errorMessages, config){
		super();
		this.connector = connector;
		this.config = config;
		this.name = config.name;
		this.router = router;
		this.errorMessages = errorMessages;

		this.queue = null;
		this.channel = null;
		this.consumerTag = null;
		this.errorCallback = null;
	}	

	start() {
		debug('Starting service...');

		return this.connector.connect()
		.then(_ => this._createChannel())
		.then(_ => this._declareQueue())
		.then(_ => this._consume())
		.then(_ => debug('Service ' + this.name + ' ready'))
		.catch(err => {
			error("Failed on service load", err);
			throw err;
		})
		.then(_ => this);
	}

	on(service, route, callback) {
		debug('Added route ' + service + ':' + route);
		this.router.add(service, route, callback);
	}

	off(service, route, callback) {
		debug('Added route ' + service + ':' + route);
		this.router.remove(service, route, callback);
	}

	_onMessage(packet) {
		verbose('New Packet received from ' + packet.fields.exchange + ':' + packet.fields.routingKey);
		var method = this.router.get(packet.fields.exchange, packet.fields.routingKey);

		if(!method)
			return;

		var promise = method(packet);

		if(typeof promise.then !== "function"){
			let message = this.errorMessages.callbackNotReturnPromise + promise;
			let err = new Error(message);
			error(message);
			
			return this.close()
			.then(_ => {
				if(this.errorCallback)
					this.errorCallback(err);
			})
			.then(_ => Promise.reject(err));
		}

		promise
		.then(result => debug(result))
		.catch(result => error(result));
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
		.then(({consumerTag}) => this.consumerTag = consumerTag);
	}

	_stopConsume() {
		return this.channel.cancel(this.consumerTag);
	}

	stop() { //TODO: Implement "Wait for all consumed messages for finish their process"
		return this._stopConsume()
		.then(_ => debug("Service stop"));
	}

	close() { //TODO: Close all the channels when 
		return this.stop()
		.then(_ => debug("Service normal exit"))
		.then(_ => this.channel.close())
		.then(_ => this.connector.close());
	}

	setErrorCallback(callback) {
		this.errorCallback = callback;
	}
};
