var logDebug = require('debug')('Omnea:SF:Service:Message:log');
var logVerbose = require('debug')('Omnea:SF:Service:Message:verbose');
var logError = require('debug')('Omnea:SF:Service:Message:error');

module.exports = class MessageProcess {
	constructor(router, emitterFactory, errorMessages) {
		this.router = router;
		this._createEmitter = emitterFactory;
		this._errorMessages = errorMessages;
		this._middlewaresBefore = new Set();
		this._middlewaresAfter = new Set();
	}

	addRoute(service, route, callback) {
		return this.router.add(service, route, callback);
	}
	
	removeRoute(service, route, callback) {
		return this.router.remove(service, route, callback);
	}

	addMiddlewareBefore(middleware) {
		this._middlewaresBefore.add(middleware);
	}

	addMiddlewareAfter(middleware) {
		this._middlewaresAfter.add(middleware);
	}

	onMessage(packet) {
		logVerbose('New Packet received from ' + packet.fields.exchange + ':' + packet.fields.routingKey);
		var method = this.router.get(packet.fields.exchange, packet.fields.routingKey);

		if(!method)
			return Promise.reject('No route found for: ' + packet.fields.routingKey);

		return this._createEmitter()
		.then(emitter => {
			var promise = this._createMiddlewaresChain(packet, false);

			return promise.then(packet => {
				var result = method(packet, emitter);
				return this._checkPromiseOnCallbackReturn(result);
			})
			.then(result => this._createMiddlewaresChain(result, true))
			.then(result => emitter.getAllMessages());
		});
	}

	_checkPromiseOnCallbackReturn(promise) {
		if(promise && typeof promise.then === "function")
			return promise;

		let message = this._errorMessages.callbackNotReturnPromise + promise;
		let err = new Error(message);
		
		err.isFatal = true;

		return Promise.reject(err);
	}

	_createMiddlewaresChain(packet, after) {
		var middlewares = this._middlewaresBefore.values();
		if(after)
			middlewares = this._middlewaresAfter.values();

		var chain = Promise.resolve(packet);
		
		for(let middleware of middlewares){
			chain = chain.then(data => {
				var result = middleware(data);
				return this._checkPromiseOnCallbackReturn(result);
			});
		}

		return chain;
	}
};
