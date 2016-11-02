var debug = require('debug')('Omnea:SF:Service:log');
var error = require('debug')('Omnea:SF:Service:error');

var ServiceFactory = require('./factories/serviceFactory');
var serviceFactory = new ServiceFactory();

var predefined_config = require('../config.json');

module.exports = class Facade {
	constructor(service) {
		this.service = service;
	}

	static start(config) {

		if(!config) config = {};

		var amqpConfig = Object.assign({}, predefined_config.amqp, config.amqp);
		var serviceConfig = Object.assign({}, predefined_config.service, config.service);

		var service = serviceFactory.build(amqpConfig, serviceConfig, config.name);
		
		return service.start()
		.then(service => new Facade(service))
		.catch(error);
	}

	middleware(callback, output) {
		if(output)
			return this.service.addOutputMiddleware();
		
		this.service.addInputMiddleware(callback);
	}

	on(service, route, callback) {
		return this.service.addRoute(service, route, callback);
	}

	off(service, route, callback) {
		return this.service.removeRoute(service, route, callback);
	}
};
