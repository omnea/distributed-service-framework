exports.create = function (di, config) {
	const Service = require(di.getAppPath('patterns/service'));
	
	return Promise.all([
		di.get('patterns/amqpConfiguration', config), 
		di.get('patterns/messageProcess'), 
		di.get('utils/errorMessages'), 
		di.get('utils/message'),
		di.get('patterns/configReader', config)
	])
	.then(dependencies => {
		return new Service(...dependencies);
	});
};
