exports.create = function (di) {
	const Emitter = require(di.getAppPath('patterns/emitter'));
	
	return di.get('utils/message')
	.then(messageUtils => {
		return Promise.resolve(new Emitter(messageUtils));
	});
};
