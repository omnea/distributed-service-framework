var debug = require('debug')('router');

module.exports = class Router {
	constructor() {
		this.callbacks = {};
	}

	add (service, route, callback) {
		var routeName = this.getRouteName(service, route);
		this.callbacks[routeName] = callback;
	}

	remove (service, route, callback) {
		var routeName = this.getRouteName(service, route);
		delete this.callbacks[routeName];
	}

	get (service, route) {
		var routeName = this.getRouteName(service, route);
		var callback = this.callbacks[routeName];

		if(!callback)
			return null;

		return callback;
	}

	getRouteName(service, route) {
		return service + '.' + route;
	}
};
