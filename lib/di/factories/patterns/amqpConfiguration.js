const AmqpConfiguration = require(global.getAppPath('patterns/amqpConfiguration'));

exports.create = function (di, config) {
	return Promise.all([di.get('connectors/amqp', config), di.get('patterns/configReader', config)])
	.then(dependencies => {
		return new AmqpConfiguration(...dependencies);
	});
};
