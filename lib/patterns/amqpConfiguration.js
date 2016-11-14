var logDebug = require('debug')('Omnea:SF:Service:amqp:log');
var logVerbose = require('debug')('Omnea:SF:Service:amqp:verbose');
var logError = require('debug')('Omnea:SF:Service:amqp:error');

module.exports = class AmqpConfiguration {
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
		.then(() => this._prepare());
	}

	_prepare() {
		return this._createChannel()
		.then(() => this._declareQueue());
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

	bind(service, route) {
		return this.channel.bindQueue(this.queue, service, route);
	}

	unbind(service, route) {
		return this.channel.unbindQueue(this.queue, service, route);
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
		.then(() => logDebug("Service stop"));
	}

	close() { //TODO: Close all the channels when 
		return this.stop()
		.then(() => this.channel.close())
		.then(() => this.amqp.close())
		.then(() => logDebug("Service normal exit"));
	}

};
