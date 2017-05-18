exports.create = function (di) {
	var production = require(di.getAppPath('config/production.json'));
	var development = require(di.getAppPath('config/development.json'));
	
	if(process.env.NODE_ENV === 'production')
		return Promise.resolve(production);
	
	return Promise.resolve(development);
};
