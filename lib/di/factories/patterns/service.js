const Service = require(global.getAppPath('patterns/service'));

exports.create = function (di, config) {

	var emitterFactory = function () {
		return di.get('patterns/emitter');
	};

	return Promise.all([di.get('connectors/amqp'), di.get('utils/router'), di.get('utils/errorMessages'), di.get('config')])
	.then(dependencies => {
		var _config = di.mergeConfs(dependencies[3].service, config);
		return new Service(dependencies[0], dependencies[1], dependencies[2], emitterFactory, _config);
	});
};
