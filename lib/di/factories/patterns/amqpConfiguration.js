exports.create = function (di, config) {
	const AmqpConfiguration = require(di.getAppPath('patterns/amqpConfiguration'));

	return Promise.all([di.get('connectors/amqp', config), di.get('patterns/configReader', config)])
	.then(dependencies => {
		return new AmqpConfiguration(...dependencies);
	});
};
