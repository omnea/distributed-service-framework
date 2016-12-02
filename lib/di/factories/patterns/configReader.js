const ConfigReader = require(global.getAppPath('patterns/configReader'));

exports.create = function (di, userConfig) {
	return di.get('config')
	.then(config => {
		return new ConfigReader(config, userConfig);
	});
};
