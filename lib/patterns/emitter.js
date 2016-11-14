module.exports = class Emitter {
	constructor () {
		this.messages = new Set();
	}

	emit (route, data) {
		if(typeof data === 'number')
			data = data + '';

		this.messages.add({route, content: new Buffer.from(data)});
	}

	getAllMessages () {
		return this.messages.values();
	}
};
