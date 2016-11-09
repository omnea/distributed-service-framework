module.exports = class Emitter {
	constructor () {
		this.messages = new Set();
	}

	emit (route, data) {
		this.messages.add({route, content: data});
	}

	getAllMessages () {
		return this.messages.values();
	}
};
