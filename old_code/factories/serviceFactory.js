var debug = require('debug')('Omnea:SF:Service:log');

module.exports = class ServiceFactory {
	build(serviceConfig, amqpConfig, name) {
		debug('Starting service...');

		if(!config) config = {};

		var Service = require('../patterns/service');
		var Router = require('../utils/router');
		var Connector = require('../connectors/amqp');
		var EmitterFactory = require('./emitterFactory');
		var RPCPattern = require('../patterns/rpc');

		var emitterFactory = new EmitterFactory();
		var router = new Router();
		var rpcPattern = new RPCPattern();
		if(!name) name = config.name;
		
		var connector = new Connector(amqpConfig);

		var internalInputMiddlewares = this._getInternalMiddlewares(config._internalInputMiddlewares);
		var internalOutputMiddlewares = this._getInternalMiddlewares(config._internalOutputMiddlewares);

		return new Service(
			connector,
			emitterFactory,
			router,
			rpcPattern,
			serviceConfig,
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
