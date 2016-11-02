module.exports = class InputPacket {
	constructor(original, service, route, content) {
		this.route = route;
		this.service = service;
		this.content = content;
		this.original = original;
	}

	getRoute() {
		return this.route;
	}

	getService() {
		return this.service;
	}

	getContent() {
		return this.content;
	}
};
