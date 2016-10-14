var debug = require('debug')('Omnea:SF:Service:log');

module.exports = class ServiceFactory {
	build(serviceConfig, amqpConfig, name) {
		debug('Starting service...');

		if(!config) config = {};

		var config = require('../../config.json');

		var Service = require('../patterns/service');
		var Router = require('../utils/router');
		var Connector = require('../connectors/amqp');
		var EmitterFactory = require('./emitterFactory');
		var RPCPattern = require('../patterns/rpc');

		var emitterFactory = new EmitterFactory();
		var router = new Router();
		var rpcPattern = new RPCPattern();

		var _amqpConfig = Object.assign({}, config.amqp, amqpConfig);
		var _serviceConfig = Object.assign({}, config.service, serviceConfig);
		if(!name) name = config.name;
		
		var connector = new Connector(_amqpConfig);

		var internalInputMiddlewares = this._getInternalMiddlewares(config._internalInputMiddlewares);
		var internalOutputMiddlewares = this._getInternalMiddlewares(config._internalOutputMiddlewares);

		return new Service(
			connector,
			emitterFactory,
			router,
			rpcPattern,
			_serviceConfig,
			name,
			internalInputMiddlewares,
			internalOutputMiddlewares
		);
	}

	_getInternalMiddlewares(middlewares) {
		if(!Array.isArray(middlewares))
			return [];

		return middlewares.map(name => this._loadFile(name));
	}

	_loadFile(name) {
		debug('Loading middleware ' + name);
		return require(__dirname + '/../middlewares/' + name + '.js');
	}
};
