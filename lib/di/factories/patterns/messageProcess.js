exports.create = function (di) {
	const MessageProcess = require(di.getAppPath('patterns/messageProcess'));

	var emitterFactory = function () {
		return di.get('patterns/emitter');
	};

	return Promise.all([di.get('utils/router'), di.get('utils/errorMessages')])
	.then(instances => {
		return new MessageProcess(instances[0], emitterFactory, instances[1]);
	});
};
