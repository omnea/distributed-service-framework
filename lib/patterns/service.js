var debug = require('debug')('Omnea:SF:Service:log');
var error = require('debug')('Omnea:SF:Service:error');

module.exports = class Service {
	constructor(connector, config){
		this.connector = connector;
		this.config = config;
		this.name = config.name;

		this.queue = null;
		this.channel = null;
	}	

	start() {
		debug('Starting service...');

		return this.connector.connect()
		.then(_ => this._createChannel())
		.then(_ => this._declareQueue())
		.then(_ => this._consume())
		.then(_ => debug('Service ' + this.name + ' ready'))
		.catch(err => {
			error("Failed on service load", err);
			throw err;
		})
		.then(_ => this);
	}


	_onMessage(packet) {
		console.log(packet);
	}

	_createChannel() {
		return this.connector.channel()
		.then(channel => this.channel = channel);
	}

	_declareQueue() {
		var options = Object.assign({}, this.config.queues.service);
		return this.channel.queue(this.name + options.nameSufix, options.options)
		.then(queueName => {
			this.queue = queueName;
		});
	}

	_consume() {
		return this.channel.consume(this.queue, (packet) => this._onMessage(packet));
	}
};
