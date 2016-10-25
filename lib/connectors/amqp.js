var debug = require('debug')('Omnea:SF:AMQP:log');
var error = require('debug')('Omnea:SF:AMQP:error');
var amqp = require('amqplib');
var uuid = require('node-uuid').v4;
var Channel = require('./amqp-channel');
var EventEmitter = require('events').EventEmitter;

module.exports = class AMQPBuilder extends EventEmitter {
	constructor(options) {
		super();
		
		this.options = mergeConfs(options);

		this.connection = null;

		this.channels = new Set();
	}

	connect () {
		var url = createAMQPUrl(this.options.url, this.options.user, this.options.pass, this.options.port);
		
		debug('Connecting to ' + this.options.url + ":" + this.options.port);
		
		return amqp.connect(url)
		.then(connection => {
			this.id = uuid();
			this.connection = connection;

			this.connection.on('close', err => debug('Connection closed ', this.id, err));
			this.connection.on('error', err => this._handleConnectionClose(err));

			debug('AMQP connection ready', this.id);

			return this._rebuildChannels();
		})
		.then(_ => this);
	}

	channel () {
		if(!this.connection)
			throw new Error("You can't create a channel without a connection");
		
		var channel = new Channel(this.connection);

		this.channels.add(channel);
		
		if(!this.connection)
			return channel;

		return channel.open(this.connection, this.id)
		.then(_ => channel)
		.catch(err => {
			this.channels.delete(channel);
			throw err;
		});
	}

	close() {
		return this.connection.close();
	}

	_handleConnectionClose(err) {
		error(err, this.id);
		this.connection = null;
		this.emit('error', "Connection closed" + JSON.stringify({id: this.id, error: err}));
	}

	_rebuildChannels() {
		var promises = [];

		this.channels.forEach(channel => {
			promises.push(channel.open(this.connection, this.id));
		});
		
		return Promise.all(promises);
	}
};

function mergeConfs (conf) {
	if(!conf) conf = {};
	
	return Object.assign({}, {
		url: "localhost",
		port: 5672,
		user: 'admin',
		pass: 'admin',
		heartbeat: 10
	}, conf);
}

function createAMQPUrl (url, user, pass, port) {
	return 'amqp://' + user + ':' + pass + '@' + url +':' + port;
}
