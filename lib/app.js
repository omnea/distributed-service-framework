const debug = require('debug')('Omnea:SF:log');
const error = require('debug')('Omnea:SF:error');

const di = require('./di/di').create();

di.get('patterns/service')
.then(service => service.start())
.then(service => {
	debug("Service started");
})
.catch(error);

