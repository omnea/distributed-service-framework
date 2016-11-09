const AmqpConfiguration = require(global.getAppPath('patterns/amqpConfiguration'));

exports.create = function (di, config) {
	return Promise.all([di.get('connectors/amqp'), di.get('config')])
	.then(dependencies => {
		dependencies[1] = di.mergeConfs(dependencies[1].service, config);
		return new AmqpConfiguration(...dependencies);
	});
};
