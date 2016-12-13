var di = require(__dirname + '/../../lib/di/di').create();

var AmqpMock = require('../mocks/amqpMock');

describe('AmqpConfiguration', function() {
	var amqpConfiguration;
	var amqpMock;

	beforeEach(function(done) {
		amqpMock = AmqpMock.mock();

		di.injectDependency('connectors/amqp', amqpMock);

		di.get('patterns/amqpConfiguration').then(instance => amqpConfiguration = instance)
		.then(done)
		.catch(err => console.log(err));
	});

	it('should reject the message if the handler has throw error', function(done) {

		var serviceName = "Service";
		var route = "Route";
		var message = "HOLA :DDD";

		spyOn(amqpMock._methods.channel,'reject').and.callThrough();

		amqpConfiguration.connect()
		.then(() => {
			amqpConfiguration.consume(() => {
				throw new Error();
			});
			
			setTimeout(() => { //Set timeout because the emission is done after the function is finish.
				expect(amqpMock._methods.channel.reject).toHaveBeenCalled();
				done();
			}, 0);

			amqpMock.mockHelpers.publish(serviceName, route, message);
		})
		.catch(err => console.log(err));
	});
});
