exports.create = function (di, config) {

	const AMQP = require(di.getAppPath('connectors/amqp'));
	const AMQP_Channel = require(di.getAppPath('connectors/amqp-channel'));

	return Promise.all([
		di.get('connectors/amqplib'), 
		di.get('patterns/configReader', config)
	])
	.then(dependencies => {
		return new AMQP(dependencies[0], AMQP_Channel, dependencies[1]);
	});
};
