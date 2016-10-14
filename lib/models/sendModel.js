module.exports = class InputPacket {
	constructor(service, route, content) {
		this.route = route;
		this.service = service;
		this.content = content;
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
