var logDebug = require('debug')('Omnea:SF:Service:Message:log');
var logVerbose = require('debug')('Omnea:SF:Service:Message:verbose');
var logError = require('debug')('Omnea:SF:Service:Message:error');

module.exports = class ServiceMessageProcessm {
	constructor(router, emitterFactory, errorMessages) {
		this.router = router;
		this._createEmitter = emitterFactory;
		this._errorMessages = errorMessages;
	}

	addRoute(service, route, callback) {
		return this.router.add(service, route, callback);
	}
	
	removeRoute(service, route, callback) {
		return this.router.remove(service, route, callback);
	}

	onMessage(packet) {
		logVerbose('New Packet received from ' + packet.fields.exchange + ':' + packet.fields.routingKey);
		var method = this.router.get(packet.fields.exchange, packet.fields.routingKey);

		if(!method)
			return;

		return this._createEmitter()
		.then(emitter => {
			var promise = method(packet, emitter);

			return this._checkPromiseOnCallbackReturn(promise)
			.then(result => emitter.getAllMessages());
		});
	}

	_checkPromiseOnCallbackReturn(promise) {
		if(typeof promise.then === "function")
			return promise;

		let message = this._errorMessages.callbackNotReturnPromise + promise;
		let err = new Error(message);
		
		err.isFatal = true;

		return Promise.reject(err);
	}
};
