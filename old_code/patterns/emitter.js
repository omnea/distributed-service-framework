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

	rpc(service, route, data) {
		var packet = this.emitPacketFactory.build(route, data);

		if(!packet) return;

		return this.rpc.send(service, route, data);
	}

	getEvents () {
		return this.events;
	}
};
