const Service = require(global.getAppPath('patterns/service'));

exports.create = function (di, config) {
	return Promise.all([di.get('connectors/amqp'), di.get('config')])
	.then(dependencies => {
		var _config = di.mergeConfs(dependencies[1].service, config);
		return new Service(dependencies[0], _config);
	});
};
