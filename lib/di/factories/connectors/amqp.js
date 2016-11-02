const AMQP = require(global.getAppPath('connectors/amqp'));
const AMQP_Channel = require(global.getAppPath('connectors/amqp-channel'));

exports.create = function (di, config) {
	return Promise.all([di.get('config'), di.get('connectors/amqplib')])
	.then(dependencies => new AMQP(dependencies[1], AMQP_Channel, dependencies[0].amqp, config));
};
