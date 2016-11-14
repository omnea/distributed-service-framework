const debug = require('debug')('Omnea:SF:log');
const error = require('debug')('Omnea:SF:error');

const di = require('./di/di').create();

exports.start = function (config) {
	return di.get('patterns/service')
	.then(service => service.start(config))
	.then(service => {
		debug("Service started");
		return service;
	})
	.catch(err => {
		error(err);
		throw err;
	});
};
