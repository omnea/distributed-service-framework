var logDebug = require('debug')('Omnea:SF:Service:amqp:log');
var logVerbose = require('debug')('Omnea:SF:Service:amqp:verbose');
var logError = require('debug')('Omnea:SF:Service:amqp:error');

module.exports = class AmqpConfiguration {
	constructor(amqp, config){
		this.amqp = amqp;
		this.config = config;

		this.consumeQueue = null;
		this.delayQueue = null;
		this.errorQueue = null;
		this.exchange = null;
		this.declaringChannel = null;
		this.consumingChannel = null;
		this.emittingChannel = null;
		this.consumerTag = null;

		this.processingMessagesCounter = 0;
	}

	connect() {
		logDebug('Starting service...');

		return this.amqp.connect()
		.then(() => this._prepare());
	}

	_prepare() {
		return this._createChannels()
		.then(() => this._declareExchange())
		.then(() => this._declareQueues())
		.then(() => this._bindQueues());
	}

	ack(message){
		this._decProcessingMessageCount();
		return this.consumingChannel.ack(message);
	}

	reject(message){
		this._decProcessingMessageCount();
		return this.consumingChannel.reject(message);
	}

	emitMessage(message) {
		return this.emittingChannel.emit(this.config.getServiceName(), message.route, message.content);
	}

	_incProcessingMessageCount(){
		this.processingMessagesCounter++;
	}

	_decProcessingMessageCount(){
		this.processingMessagesCounter--;
	}

	_getProcessingMessagesCount(){
		return this.processingMessagesCounter;
	}

	_createChannels() {
		return Promise.all([
			this.amqp.channel().then(channel => this.declaringChannel = channel),
			this.amqp.channel().then(channel => this.consumingChannel = channel),
			this.amqp.channel().then(channel => this.emittingChannel = channel)
		]);
	}

	_declareQueues() {
		var types = ['consume', 'delay', 'error'];

		return Promise.all(
			types.map(type => {
				if(!this.config.existQueue(type)) return null;
				return this.declaringChannel.queue(this.config.getQueueName(type), this.config.getQueueOptions(type))
				.then(queue => this[type + 'Queue'] = queue);
			})
		);
	}

	_bindQueues() {
		var types = ['consume', 'delay', 'error'];

		return Promise.all(
			types.map(type => {
				if(!this.config.existQueue(type)) return null;
				var bindings = this.config.getQueueBindings(type);
				return Promise.all(bindings.map(binding => {
					this.declaringChannel.bindQueue(this.config.getQueueName(type), binding.exchange, binding.route);
				}));
			})
		);
	}

	_declareExchange() {
		return this.declaringChannel.exchange(this.config.getExchangeName(), this.config.getExchangeType(), this.config.getExchangeOptions())
		.then(exchange => {
			this.exchange = exchange;
		});
	}

	bind(service, route) {
		return this.declaringChannel.bindQueue(this.consumeQueue, service, route);
	}

	unbind(service, route) {
		return this.declaringChannel.unbindQueue(this.consumeQueue, service, route);
	}

	consume(handler) {
		return this.consumingChannel.consume(this.consumeQueue, (packet) => {
			this._incProcessingMessageCount();
			
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
		return this.consumingChannel.cancel(this.consumerTag);
	}

	stop() {
		return this._stopConsume()
		.then(() => logDebug("Service stop"));
	}

	close() {
		return this.stop()
		.then(() => this._waitUntilAllReady())
		.then(() => this.declaringChannel.close())
		.then(() => this.consumingChannel.close())
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
			if(this._getProcessingMessagesCount() <= 0)
				return resolve();

			var start = new Date().getTime();

			var id = setInterval(() => {

				var reachTimeout = (new Date().getTime() - start) < this.config.getCloseTimeout() * 1000; //Max timeout for not be stuck closing forever
				var stillMessages = this._getProcessingMessagesCount() > 0; //If there is any messsage still processing

				if(stillMessages && !reachTimeout) 
					return;
				
				clearInterval(id);

				return resolve();
			}, 1000);
		});
	}
};
