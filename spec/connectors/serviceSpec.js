var di = require(__dirname + '/../../lib/di/di').create();

var amqpMock = require('../mocks/amqpMock').mock();

describe('Patterns', function() {
	describe('Service', function() {
		var service;

		beforeEach(function(done) {
			di.injectDependency('connectors/amqp', amqpMock);

			di.get('patterns/service', serviceConfig)
			.then(instance => service = instance)
			.then(done)
			.catch(err => {
				console.log(err);
				done(err);
			});
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
				expect(amqpMock._methods.channel.queue).toHaveBeenCalledWith('NO_NAMED_SERVICE_TEST_receive_test', serviceConfig.queues.service.options);
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
	});
});


var serviceConfig = {
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
