const message = require(global.getAppPath('utils/message'));

exports.create = function () {
	return Promise.resolve(message);
};
