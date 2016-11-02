var production = require(global.getAppPath('config/production.json'));
var development = require(global.getAppPath('config/development.json'));

exports.create = function (di) {
	if(process.env.NODE_ENV === 'production')
		return Promise.resolve(production);
	
	return Promise.resolve(development);
};
