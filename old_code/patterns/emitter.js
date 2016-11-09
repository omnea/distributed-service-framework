module.exports = class Emitter {
	constructor (emitPacketFactory, rpc) {
		this.events = [];
		this.emitPacketFactory = emitPacketFactory;
		this.rpc = rpc;
	}

	emit (route, data) {
		var packet = this.emitPacketFactory.build(route, data);
		
		if(!packet) return;

		this.events.push(packet);
	}

	getAllMessages () {
		return this.events;
	}
};
