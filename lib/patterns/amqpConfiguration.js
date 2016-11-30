var logDebug = require('debug')('Omnea:SF:Service:amqp:log');
var logVerbose = require('debug')('Omnea:SF:Service:amqp:verbose');
var logError = require('debug')('Omnea:SF:Service:amqp:error');

module.exports = class AmqpConfiguration {
	constructor(amqp, config){
		this.amqp = amqp;
		this.config = config;

		this.receiveQueue = null;
		this.delayQueue = null;
		this.errorQueue = null;
		this.exchange = null;
		this.declareChannel = null;
		this.consumerChannel = null;
		this.emittingChannel = null;
		this.consumerTag = null;

		this.processingQueue = 0;
	}

	connect() {
		logDebug('Starting service...');

		return this.amqp.connect()
		.then(() => this._prepare());
	}

	_prepare() {
		return this._createChannels()
		.then(() => this._declareExchange())
		.then(() => this._declareQueues());
	}

	ack(message){
		this.processingQueue--;
		return this.consumerChannel.ack(message);
	}

	reject(message){
		this.processingQueue--;
		return this.consumerChannel.reject(message);
	}

	emitMessage(message) {
		return this.emittingChannel.emit(this.config.name, message.route, message.content);
	}

	_createChannels() {
		return Promise.all([
			this.amqp.channel().then(channel => this.declareChannel = channel),
			this.amqp.channel().then(channel => this.consumerChannel = channel),
			this.amqp.channel().then(channel => this.emittingChannel = channel)
		]);
	}

	_declareQueues() {
		var receiveOpts = this.config.queues.receive;
		var consumeOpts = this.config.queues.consume;
		var errorOpts = this.config.queues.error;

		return Promise.all([
			this.declareChannel.queue(this.config.name + receiveOpts.sufix, receiveOpts.options).then(queue => this.receiveQueue = queue),
			this.declareChannel.queue(this.config.name + consumeOpts.sufix, consumeOpts.options).then(queue => this.delayQueue = queue),
			this.declareChannel.queue(this.config.name + errorOpts.sufix, errorOpts.options).then(queue => this.errorQueue = queue)
		]);
	}

	_declareExchange() {
		var options = this.config.exchanges.service;
		return this.declareChannel.exchange(this.config.name, options.type, options.options)
		.then(exchange => {
			this.exchange = exchange;
		});
	}

	bind(service, route) {
		return this.declareChannel.bindQueue(this.receiveQueue, service, route);
	}

	unbind(service, route) {
		return this.declareChannel.unbindQueue(this.receiveQueue, service, route);
	}

	consume(handler) {
		return this.consumerChannel.consume(this.receiveQueue, (packet) => {
			this.processingQueue++;
			
			try{
				handler(packet);
			}catch(e){
				logError(e);
				return this.reject(packet);
			}
		})
		.then(consumerTag => this.consumerTag = consumerTag);
	}

	_stopConsume() {
		return this.consumerChannel.cancel(this.consumerTag);
	}

	stop() { //TODO: Implement "Wait for all consumed messages for finish their process"
		return this._stopConsume()
		.then(() => logDebug("Service stop"));
	}

	close() { //TODO: Close all the channels when 
		return this.stop()
		.then(() => this._waitUntilAllReady())
		.then(() => this.declareChannel.close())
		.then(() => this.consumerChannel.close())
		.then(() => this.emittingChannel.close())
		.then(() => this.amqp.close())
		.then(() => logDebug("Service normal exit"))
		.catch((e) => {
			logError(e);
			setTimeout(() => process.exit(-1), 1000);
		});
	}

	_waitUntilAllReady() {
		return new Promise((resolve) => {
			if(this.processingQueue <= 0)
				return resolve();

			var start = new Date().getTime();

			var id = setInterval(() => {

				var reachTimeout = (new Date().getTime() - start) < this.config.closeTimeout * 1000; //Max timeout for not be stuck closing forever
				var stillMessages = this.processingQueue > 0; //If there is any messsage still processing

				if(stillMessages && !reachTimeout) 
					return;
				
				clearInterval(id);

				return resolve();
			}, 1000);
		});
	}
};
