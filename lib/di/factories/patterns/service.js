const Service = require(global.getAppPath('patterns/service'));

exports.create = function (di, config) {
	return Promise.all([
		di.get('patterns/amqpConfiguration', config), 
		di.get('patterns/messageProcess'), 
		di.get('utils/errorMessages'), 
		di.get('patterns/configReader', config)
	])
	.then(dependencies => {
		return new Service(...dependencies);
	});
};
