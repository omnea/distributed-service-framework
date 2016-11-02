var Model = require('../models/inputPacket');

module.exports = function PacketInputMapper(packet) {
	var content = packet.content;
	var route = packet.fields.routingKey;
	var service = packet.fields.exchange;

	return new Model(original, service, route, content);
};
