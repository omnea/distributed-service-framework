const MessageProcess = require(global.getAppPath('patterns/messageProcess'));

exports.create = function (di) {

	var emitterFactory = function () {
		return di.get('patterns/emitter');
	};

	return Promise.all([di.get('utils/router'), di.get('utils/errorMessages')])
	.then(instances => {
		return new MessageProcess(instances[0], emitterFactory, instances[1]);
	});
};
