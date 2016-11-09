var logDebug = require('debug')('Omnea:SF:Service:amqp:log');
var logVerbose = require('debug')('Omnea:SF:Service:amqp:verbose');
var logError = require('debug')('Omnea:SF:Service:amqp:error');

module.exports = class Service {
	constructor(amqp, config){
		this.amqp = amqp;
		this.config = config;
		this.queue = null;
		this.channel = null;
		this.consumerTag = null;
	}

	connect() {
		logDebug('Starting service...');

		return this.amqp.connect()
		.then(_ => this._declare());
	}

	_declare() {
		return this._createChannel()
		.then(_ => this._declareQueue());
	}

	ack(message){
		return this.channel.ack(message);
	}

	reject(message){
		return this.channel.reject(message);
	}

	emitMessage(message) {
		return this.channel.emit(this.config.name, message.route, message.content);
	}

	_createChannel() {
		return this.amqp.channel()
		.then(channel => this.channel = channel);
	}

	_declareQueue() {
		var options = this.config.queues.service;
		return this.channel.queue(this.config.name + options.nameSufix, options.options)
		.then(queueName => {
			this.queue = queueName;
		});
	}

	consume(handler) {
		return this.channel.consume(this.queue, (packet) => {
			try{
				handler(packet);
			}catch(e){
				logError(e);
			}
		})
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
		.then(_ => this.channel.close())
		.then(_ => this.amqp.close())
		.then(_ => logDebug("Service normal exit"));
	}

};
