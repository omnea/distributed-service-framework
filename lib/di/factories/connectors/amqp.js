const AMQP = require(global.getAppPath('connectors/amqp'));
const AMQP_Channel = require(global.getAppPath('connectors/amqp-channel'));

exports.create = function (di, config) {
	return Promise.all([di.get('connectors/amqplib'), di.get('patterns/configReader', config)])
	.then(dependencies => {
		return new AMQP(dependencies[0], AMQP_Channel, dependencies[1]);
	});
};
