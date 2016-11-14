var error = require('debug')('Omnea:SF:error');
var log = require('debug')('Omnea:SF:log');

var Service = require('../lib/app.js');

Service.start({name: "children"})
.catch(error)
.then(service => {
	service.on('mother', 'come.to.dinner', log)
	.catch(err => console.log(err));
});
