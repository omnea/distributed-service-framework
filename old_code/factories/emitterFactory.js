var Emitter = require('../patterns/emitter');
var EmitPacketFactory = require('./sendPacketModelFactory');

module.exports = class EmitterFactory {
	constructor() {
		this.emitPacketFactory = new EmitPacketFactory();
	}

	build(rpcPattern) {
		return new Emitter(this.emitPacketFactory, rpcPattern);
	}
};
