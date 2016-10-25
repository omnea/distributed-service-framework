var error = require('debug')('Omnea:SF:error');
var log = require('debug')('Omnea:SF:log');

var Service = require('../lib/facade.js');

Service.start()
.catch(error)
.then(service => {
	service.on('mother', 'come.to.dinner', log)
	.catch(_ => {});
});
