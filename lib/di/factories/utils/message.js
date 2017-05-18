exports.create = function (di) {
	const message = require(di.getAppPath('utils/message'));

	return Promise.resolve(message);
};
