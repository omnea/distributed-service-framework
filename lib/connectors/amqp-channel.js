var debug = require('debug')('Omnea:SF:AMQP:channel:log');
var error = require('debug')('Omnea:SF:AMQP:channel:error');
var uuid = require('node-uuid').v4;
var EventEmitter = require('events').EventEmitter;

module.exports = class AMQPBuilder extends EventEmitter{
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
			return exchange;
		});
	}

	queue (name, options) {
		return this.channel.assertQueue(name, options)
		.then(queue => {
			debug('Queue ' + queue.queue + ' created', this.id, this.connectionId);
			return queue.queue;
		});
	}

	bindQueue(queueName, exchangeSource, route, options) {
		return this.channel.bindQueue(queueName, exchangeSource, route, options)
		.then(_ => debug('Queue ' + queueName + ' binded to ' + exchangeSource + ':' + route, this.id, this.connectionId))
		.catch(err => {
			var errorData = this._createErrorBinding(queueName, exchangeSource, route, options, err);
			error(errorData);
			throw new Error("Bind failed: " + JSON.stringify(errorData));
		});
	}

	close() {
		return this.channel.close();
	}

	_createErrorBinding() {
		return {
			queueName, 
			exchangeSource, 
			route, 
			options, 
			message: err.message,
			stack: err.stack,
			channelId: this.id,
			connectionId: this.connectionId
		};
	}
};
