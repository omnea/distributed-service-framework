const Emitter = require(global.getAppPath('patterns/emitter'));

exports.create = function (di) {
	return di.get('utils/message')
	.then(messageUtils => {
		return Promise.resolve(new Emitter(messageUtils));
	});
};
