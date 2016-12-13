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
			channel.queue(config.getQueueName('error'), config.getQueueOptions('error')),
			channel.queue(config.getQueueName('delay'), config.getQueueOptions('delay')),
			channel.exchange(config.getExchangeName('delay'), config.getExchangeOptions('delay')),
			channel.checkQueue(config.getGlobalErrorQueueName()),
			channel.checkExchange(config.getGlobalErrorExchangeName())
		])
		.then(() => { //Consume
			log("Error handler started for service " + config.getServiceName());
			return channel.consume(config.getQueueName('error'), consumeCallback.bind(null, channel, config));
		});
	})
	.catch(e => logError(e));
};
