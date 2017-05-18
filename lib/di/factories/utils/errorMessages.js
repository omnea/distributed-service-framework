exports.create = function (di) {
	const messages = require(di.getAppPath('utils/errorMessages'));
	
	return Promise.resolve(messages);
};
