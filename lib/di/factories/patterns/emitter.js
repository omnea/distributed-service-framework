const Emitter = require(global.getAppPath('patterns/emitter'));

exports.create = function () {
	return Promise.resolve(new Emitter());
};
