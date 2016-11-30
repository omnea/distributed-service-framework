const AMQP = require(global.getAppPath('connectors/amqp'));
const AMQP_Channel = require(global.getAppPath('connectors/amqp-channel'));

exports.create = function (di, config) {
	return Promise.all([di.get('connectors/amqplib'), di.get('config')])
	.then(dependencies => {
		var _config = di.mergeConfs(dependencies[1].amqp, config.amqp);
		return new AMQP(dependencies[0], AMQP_Channel, _config);
	});
};
