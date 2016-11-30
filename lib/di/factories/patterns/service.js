const Service = require(global.getAppPath('patterns/service'));

exports.create = function (di, config) {
	return Promise.all([di.get('patterns/amqpConfiguration', config), di.get('patterns/messageProcess'), di.get('utils/errorMessages'), di.get('config')])
	.then(dependencies => {
		dependencies[3] = di.mergeConfs(dependencies[3].service, config.service);
		return new Service(...dependencies);
	});
};
