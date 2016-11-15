const debug = require('debug')('Omnea:SF:log');
const error = require('debug')('Omnea:SF:error');

const di = require('./di/di').create();

exports.start = function (config) {
	return di.get('patterns/service', config)
	.then(service => service.start())
	.then(service => {
		debug("Service started");
		return service;
	})
	.catch(err => {
		error(err);
		throw err;
	});
};
