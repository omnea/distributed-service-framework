var logDebug = require('debug')('Omnea:SF:Service:amqp:log');
var logVerbose = require('debug')('Omnea:SF:Service:amqp:verbose');
var logError = require('debug')('Omnea:SF:Service:amqp:error');
var EventEmitter = require('events').EventEmitter;

module.exports = class AmqpConfiguration extends EventEmitter {
	constructor(amqp, config){
		super();
		
		this.amqp = amqp;
		this.config = config;

		this.consumeQueue = null;
		this.exchange = null;
		this.declaringChannel = null;
		this.consumingChannel = null;
		this.emittingChannel = null;
		this.consumerTag = null;

		this.processingMessagesCounter = 0;
	}

	connect() {
		logDebug('Starting service...');

		this.amqp.on('close', err => this.emit('close', err));

		return this.amqp.connect()
		.then(() => this._prepare());
	}

	_prepare() {
		return this._createChannels()
		.then(() => this._checkGlobalError())
		.then(() => this._declareExchanges())
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
		var promises = [];

		this.config.iterateQueues(name => {
			var bindings = this.config.getQueueBindings(name);
			promises.push(this.declaringChannel.queue(this.config.getQueueName(name), this.config.getQueueOptions(name))
				.then(queue => {
					if(name === 'consume')
						this.consumeQueue = queue;
				})
			);
		});

		return Promise.all(promises);
	}

	_bindQueues() {
		var promises = [];

		this.config.iterateQueues(name => {
			var bindings = this.config.getQueueBindings(name);
			promises.push(Promise.all(bindings.map(binding => {
				this.declaringChannel.bindQueue(this.config.getQueueName(name), binding.exchange, binding.route);
			})));
		});

		return Promise.all(promises);
	}

	_declareExchanges() {
		var promises = [];

		this.config.iterateExchanges(name => {
			return this.declaringChannel.exchange(this.config.getExchangeName(name), this.config.getExchangeType(name), this.config.getExchangeOptions(name))
			.then(exchange => {
				if(name === 'service')
					this.exchange = exchange;
			});
		});

		return Promise.all(promises);
	}

	_checkGlobalError() {
		return Promise.all([
			this.declaringChannel.checkQueue(this.config.getGlobalErrorQueueName()),
			this.declaringChannel.checkExchange(this.config.getGlobalErrorExchangeName())
		]);
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
		.then(response => this.consumerTag = response.consumerTag);
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
			/* istanbul ignore next */
			logError(e);
			/* istanbul ignore next: we can't test a process.exit(-1) because we will close the test suit */
			setTimeout(() => process.exit(-1), 1000);
		});
	}

	_waitUntilAllReady() {
		return new Promise((resolve) => {
			if(this._getProcessingMessagesCount() <= 0)
				return resolve();

			var start = new Date().getTime();

			var id = setInterval(() => {

				var reachTimeout = (new Date().getTime() - start) > this.config.getCloseTimeout() * 1000; //Max timeout for not be stuck closing forever
				var stillMessages = this._getProcessingMessagesCount() > 0; //If there is any messsage still processing

				if(stillMessages && !reachTimeout) 
					return;
				
				clearInterval(id);

				return resolve();
			}, 300);
		});
	}
};
