const debug = require('debug')('Omnea:SF:log');
const error = require('debug')('Omnea:SF:error');

const di = require('./di/di').create();

di.get('connectors/amqp', {})
.then(amqp => amqp.connect())
.then(amqp => amqp.channel())
.then(channel => {
	debug("Channel created.");
})
.catch(err => error(err));
