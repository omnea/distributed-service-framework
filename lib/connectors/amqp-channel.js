var debug = require('debug')('Omnea:SF:AMQP:channel:log');
var error = require('debug')('Omnea:SF:AMQP:channel:error');
var uuid = require('uuid/v4');
var EventEmitter = require('events').EventEmitter;

module.exports = class AMQPChannel extends EventEmitter{
	constructor() {
		super();
		this.channel = null;
		this.id = uuid();
		this.connectionId = null;
	}

	open (connection, connectionId) {

		this.connection = connection;
		this.connectionId = connectionId;

		return connection.createChannel()
		.then(channel => {
			debug('New channel ready', this.id, this.connectionId);

			this.channel = channel;
		});
	}

	exchange (name, type, options) {
		return this.channel.assertExchange(name, type, options)
		.then(exchange => {
			debug('Exchange ' + exchange.exchange + ' ready', this.id, this.connectionId);
			return exchange.exchange;
		});
	}

	queue (name, options) {
		return this.channel.assertQueue(name, options)
		.then(queue => {
			debug('Queue ' + queue.queue + ' created', this.id, this.connectionId);
			return queue.queue;
		});
	}

	checkQueue (name) {
		return this.channel.checkQueue(name)
		.then(queue => {
			debug('Queue ' + name + ' checked', this.id, this.connectionId);
			return queue.queue;
		});
	}

	checkExchange (name) {
		return this.channel.checkExchange(name)
		.then(exchange => {
			debug('Exchange ' + name + ' checked', this.id, this.connectionId);
			return exchange.exchange;
		});
	}

	bindQueue(queueName, exchangeSource, route, options) {
		return this.channel.bindQueue(queueName, exchangeSource, route, options)
		.then(() => debug('Queue ' + queueName + ' binded to ' + exchangeSource + ':' + route, this.id, this.connectionId))
		.catch(err => {
			var errorData = this._createErrorBinding(queueName, exchangeSource, route, options, err);
			error(errorData);
			throw new Error("Bind failed: " + JSON.stringify(errorData));
		});
	}

	unbindQueue(queueName, exchangeSource, route, options) {
		return this.channel.unbindQueue(queueName, exchangeSource, route, options)
		.then(() => debug('Queue ' + queueName + ' unbinded from ' + exchangeSource + ':' + route, this.id, this.connectionId))
		.catch(err => {
			var errorData = this._createErrorBinding(queueName, exchangeSource, route, options, err);
			error(errorData);
			throw new Error("Unbind failed: " + JSON.stringify(errorData));
		});
	}

	consume(queue, callback) {
		return this.channel.consume(queue, callback)
		.then(({consumerTag}) => {
			debug('Consuming start for queue ' + queue);
			return consumerTag;
		});
	}

	cancel(consumerTag) {
		return this.channel.cancel(consumerTag)
		.then(() => {
			debug('Consuming stop');
			return consumerTag;
		});
	}

	close() {
		return this.channel.close();
	}

	ack(message) {
		this.channel.ack(message);
		debug('Message adknowledged');
		return Promise.resolve();
	}

	reject(message) {
		this.channel.nack(message, false, false);
		debug('Message Rejected');
		return Promise.resolve();
	}

	emit(exchange, route, content, options) {
		this.channel.publish(exchange, route, content, options);
		debug('Message published', exchange, route);
		return Promise.resolve();
	}

	qos(numberOfMessages) {
		return this.channel.prefetch(numberOfMessages);
	}

	_createErrorBinding(queueName, exchangeSource, route, options, err) {
		return {
			queueName, 
			exchangeSource, 
			route, 
			options, 
			message: (err) ? err.message : undefined,
			stack: (err) ? err.stack : undefined,
			channelId: this.id,
			connectionId: this.connectionId
		};
	}
};
