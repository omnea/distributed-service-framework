exports.create = function (di) {
	const Router = require(di.getAppPath('utils/router'));

	return Promise.resolve(new Router());
};
