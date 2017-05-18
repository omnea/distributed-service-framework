exports.create = function (di, userConfig) {
	const ConfigReader = require(di.getAppPath('patterns/configReader'));
	
	return di.get('config')
	.then(config => {
		return new ConfigReader(config, userConfig);
	});
};
