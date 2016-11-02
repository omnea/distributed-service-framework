var EmitPacket = require('../models/sendModel');

module.exports = class EmitPacketFactory {
	build(route, content) {
		return new EmitPacket(route, content);
	}
};
