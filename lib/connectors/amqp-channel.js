var debug = require('debug')('Omnea:SF:AMQP:channel:log');
var error = require('debug')('Omnea:SF:AMQP:channel:error');
var uuid = require('node-uuid').v4;
var EventEmitter = require('events').EventEmitter;

module.exports = class AMQPBuilder extends EventEmitter{
	constructor() {
		super();
		this.channel = null;
		this.id = uuid();
	}

	open (connection, id) {

		this.connection = connection;
		this.completeId = this.id + "|" + id;

		return connection.createChannel()
		.then(channel => {
			debug('New channel ready', this.getId());

			this.connection.on('close', err => debug("Channel closed", this.id, err));
			this.connection.on('error', err => this._handleChannelClose(err));

			this.channel = channel;
		});
	}

	exchange (name, type, options) {
		return this.channel.assertExchange(name, type, options)
		.then(exchange => {
			debug('Exchange ' + exchange.exchange + ' ready', this.getId());
			return exchange;
		});
	}

	queue (name, options) {
		return this.channel.assertQueue(name, options)
		.then(queue => {
			debug('Queue ' + queue.queue + ' created', this.getId());
			return queue.queue;
		});
	}

	bindQueue(queueName, exchangeSource, route, options) {
		return this.channel.bindQueue(queueName, exchangeSource, route, options)
		.then(_ => debug('Queue ' + queueName + ' binded to ' + exchangeSource + ':' + route, this.getId()))
		.catch(err => {
			error(err, this.getId());
			throw new Error("Bind failed for: " + JSON.stringify({
				queueName, 
				exchangeSource, 
				route, 
				options, 
				message: err.message,
				connectionId: this.getId() 
			}));
		});
	}

	close() {
		return this.channel.close();
	}

	getId() {
		if(this.completeId)
			return this.completeId;

		return this.id;
	}

	_handleChannelClose(err) {
		error(err, this.id);
		this.channel = null;
		this.emit('error', "Channel closed" + JSON.stringify({id: this.id, error: err}));
	}
};
