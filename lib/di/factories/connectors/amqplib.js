const amqplib = require("amqplib");

exports.create = function () {
	return Promise.resolve(amqplib);
};
