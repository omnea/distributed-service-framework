var debug = require('debug')('Omnea:SF:AMQP:log');
var error = require('debug')('Omnea:SF:AMQP:error');
var uuid = require('node-uuid').v4;
var EventEmitter = require('events').EventEmitter;

module.exports = class AMQPBuilder extends EventEmitter {
	constructor(amqp, AmqpChannel, config) {
		super();
		
		this.options = config.getAMQPConfig();
		this.connection = null;
		this.channels = new Set();
		this.amqp = amqp;
		this.AmqpChannel = AmqpChannel;
		this.id = null;
	}

	connect () {
		debug('Connecting to ' + this.options.url + ":" + this.options.port);
		
		var amqpUrl = this._createAMQPUrl(this.options);

		return this.amqp.connect(amqpUrl)
		.then(connection => {
			this.connection = connection;

			this.id = uuid();

			this.connection.on('close', err => {
				this.emit('close', err);
			});

			debug('AMQP connection ready');
		})
		.then(() => this);
	}

	channel () {
		if(!this.connection)
			throw new Error("You can't create a channel before connect().");
		
		var channel = new this.AmqpChannel(this.connection);

		return channel.open(this.connection, this.id)
		.then(() => this.channels.add(channel))
		.then(() => channel);
	}

	close() {
		return this.connection.close();
	}
	
	_createAMQPUrl (options) {
		return 'amqp://' + options.user + ':' + options.pass + '@' + options.url +':' + options.port + '?heartbeat=' + options.heartbeat + '&channelMax=' + options.channelMax;
	}
};
