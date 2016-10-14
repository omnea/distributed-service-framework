var debug = require('debug')('Omnea:SF:AMQP:log');
var amqp = require('amqplib');

module.exports = class AMQPBuilder {
	constructor(options) {
		
		this.options = mergeConfs(options);

		this.connection = null;
	}

	connect () {
		var url = createAMQPUrl(this.options.url, this.options.user, this.options.pass, this.options.port);
		
		debug('Connecting to ' + this.options.url + ":" + this.options.port);
		
		return amqp.connect(url)
		.then(connection => {
			this.connection = connection;
			debug('AMQP connection ready');
			return this;
		});
	}

	channel () {
		return this.connection.createChannel()
		.then(channel => {
			debug('New channel ready');
			return channel;
		});
	}

	exchange (channel, name, type, options) {
		return channel.assertExchange(name, type, options)
		.then(exchange => {
			debug('Exchange ' + exchange.exchange + ' ready');
			return exchange;
		});
	}

	queue (channel, name, options) {
		return channel.assertQueue(name, options)
		.then(queue => {
			debug('Queue ' + queue.queue + ' created');
			return queue.queue;
		});
	}

	bindQueue(channel, queueName, exchangeSource, route, options) {
		return channel.bindQueue(queueName, exchangeSource, route, options)
		.then(_ => debug('Queue ' + queueName + ' binded to ' + exchangeSource + ':' + route));
	}

	close() {
		return this.connection.close();
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
