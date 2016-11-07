const Router = require(global.getAppPath('utils/router'));

exports.create = function () {
	return Promise.resolve(new Router());
};
