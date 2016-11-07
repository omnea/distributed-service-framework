const messages = require(global.getAppPath('utils/errorMessages'));

exports.create = function () {
	return Promise.resolve(messages);
};
