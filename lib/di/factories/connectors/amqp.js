var AMQP = require(global.getAppPath('connectors/amqp'));
var AMQP_Channel = require(global.getAppPath('connectors/amqp-channel'));
var amqplib = require("amqplib");


exports.create = function (di, config) {
	return di.get('config')
	.then(predefinedConfig => new AMQP(amqplib, AMQP_Channel, predefinedConfig.amqp, config));
};
