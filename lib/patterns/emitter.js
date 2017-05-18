module.exports = class Emitter {
	constructor (messageUtils) {
		this.messageUtils = messageUtils;
		this.messages = new Set();
	}

	emit (route, data) {
		var message = this.messageUtils.fromArguments(route, data);

		this.messages.add(message);
	}

	getAllMessages () {
		return this.messages.values();
	}
};
