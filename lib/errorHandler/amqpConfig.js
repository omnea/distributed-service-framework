const log = require('debug')('Omnea:SF:errorHandler:log');
const logVerbose = require('debug')('Omnea:SF:errorHandler:verbose');
const logError = require('debug')('Omnea:SF:errorHandler:error');

const amqp = require('amqplib');
const di = require('../di/di').create();

const config = require(process.env.CONFIG_FILE);

module.exports = function(consumeCallback) {
	return Promise.all([ //Get config reader and dependency
		di.get('patterns/configReader', config),
		di.get('connectors/amqp', config)
	])
	.then(([config, amqp]) => { //Connect and get the channel
		return amqp.connect()
		.then(connection => connection.channel())
		.then(channel => [channel, config]);
	})
	.then(([channel, config]) => { //Declare queues
		return Promise.all([
			channel.queue( config.getQueueName('error'), config.getQueueOptions('error') ),
			channel.exchange( config.getExchangeName('delay'), config.getExchangeType('delay'), config.getExchangeOptions('delay') ),
			channel.checkExchange( config.getGlobalErrorExchangeName() )
		])
		.then(() => { //Consume
			log("Error handler started for service " + config.getServiceName());
			return channel.consume(config.getQueueName('error'), consumeCallback.bind(null, channel, config));
		});
	})
	.catch(e => logError(e));
};
