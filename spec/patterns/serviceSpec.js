var di = require(__dirname + '/../../lib/di/di').create();

var AmqpMock = require('../mocks/amqpMock');

var SERVICE_CONFIG = {
	"name": "NO_NAMED_SERVICE_TEST",
	"queues": {
		"service": {
			"nameSufix": "_receive_test",
			"options": {
				"exclusive": false,
				"durable": true,
				"autoDelete": false,
				"arguments": {
					
				}
			}
		}
	}
};

var QUEUE_NAME_RESULT = "NO_NAMED_SERVICE_TEST_receive_test";

describe('Patterns', function() {
	describe('Service', function() {
		var service;
		var amqpMock;
		var errorMessages;

		beforeEach(function(done) {
			amqpMock = AmqpMock.mock();

			di.injectDependency('connectors/amqp', amqpMock);

			Promise.all([
				di.get('utils/errorMessages').then(messages => errorMessages = messages),
				di.get('patterns/service', SERVICE_CONFIG).then(instance => service = instance)
			]).then(done)
			.catch(err => console.log(err));
		});

		it('should connect to amqp when started', function(done) {
			spyOn(amqpMock._methods.connection,'connect').and.callThrough();

			service.start()
			.then(_ => {
				expect(amqpMock._methods.connection.connect).toHaveBeenCalled();
				expect(amqpMock._methods.connection.connect.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should try to create a channel when started', function(done) {
			spyOn(amqpMock._methods.connection,'channel').and.callThrough();

			service.start()
			.then(_ => {
				expect(amqpMock._methods.connection.channel).toHaveBeenCalled();
				expect(amqpMock._methods.connection.channel.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should try to create a queue when started', function(done) {
			spyOn(amqpMock._methods.channel,'queue').and.callThrough();

			service.start()
			.then(_ => {
				expect(amqpMock._methods.channel.queue).toHaveBeenCalledWith(QUEUE_NAME_RESULT, SERVICE_CONFIG.queues.service.options);
				expect(amqpMock._methods.channel.queue.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should try to consume when started', function(done) {
			spyOn(amqpMock._methods.channel,'consume').and.callThrough();

			service.start()
			.then(_ => {
				expect(amqpMock._methods.channel.consume).toHaveBeenCalled();
				expect(amqpMock._methods.channel.consume.calls.count()).toEqual(1);
				done();
			})
			.catch(err => console.log(err));
		});

		it('should throw and error if the callback do not return a Promise', function(done) {

			service.setErrorCallback((err) => {
				expect(err.message).toBe(errorMessages.callbackNotReturnPromise + ":DDDDD");
				done();
			});

			service.start()
			.then(service => {
				service.on("Service", "route", () => ":DDDDD");
				
				amqpMock.mockHelpers.publish("Service", "route", "HOLA :D");
			})
			.catch(err => console.log(err));
		});

		it('should call close on the amqp if the callback do not return a Promise', function(done) {
			spyOn(amqpMock._methods.connection,'close').and.callThrough();

			service.setErrorCallback((err) => {
				expect(amqpMock._methods.connection.close).toHaveBeenCalled();
				expect(amqpMock._methods.connection.close.calls.count()).toEqual(1);
				done();
			});

			service.start()
			.then(service => {
				service.on("Service", "route", () => ":DDDDD");
				
				amqpMock.mockHelpers.publish("Service", "route", "HOLA :D");
			})
			.catch(err => console.log(err));
		});
	});
});
