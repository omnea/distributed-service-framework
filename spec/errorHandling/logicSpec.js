var AmqpMock = require('../mocks/amqpMock');
var ConfigReader = require('../../lib/patterns/configReader');
var CONFIG = require('../../lib/config/development');
var Logic = require('../../lib/errorHandler/logic');
var LogicErrorMessages = require('../../lib/errorHandler/rejectionMessages');
var MessageMockBuilder = require('../mocks/messageMock');

var REASON_REJECTED = 'rejected';
var REASON_EXPIRED = 'expired';
var DEFAULT_ROUTE = 'hi';

describe('ErrorHandler', function() {
	describe('Logic', function() {
		var amqpMock, config, messageBuilder, channel;
		
		beforeEach(function(done) {
			amqpMock = AmqpMock.mock();
			config = new ConfigReader(CONFIG, {});
			messageBuilder = new MessageMockBuilder(config);
			messageBuilder.route(DEFAULT_ROUTE);
			amqpMock.create().then((amqp) => {
				amqp.channel().then(_channel => {
					channel = _channel;
					done();
				});
			});
		});

		it('should send to GEE a message that do not have the x-death header (makes no sense to be in this queue and to not be rejected)', function() {
			var message = messageBuilder.deleteHeader('x-death').get();

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);
		});

		it('should send to GEE a message that was rejected from NQ two times', function() {
			var message = messageBuilder.reject(
				config.getExchangeName('service'), 
				config.getQueueName('consume'), 
				2, 
				REASON_REJECTED
			).get();

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);

			expect(message.properties.headers._globalErrorReason).toBe(LogicErrorMessages.REASON_REJECTED_TOO_MANY_TIMES(2, 2));
		});

		it('should send to DE a message that was rejected from NQ less than two times', function() {
			var message = messageBuilder.reject(
				config.getExchangeName('service'), 
				config.getQueueName('consume'), 
				1, 
				REASON_REJECTED
			).get();

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getExchangeName('delay'), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);
		});

		it('should send to DE a message that was rejected with a falseable count', function() {
			var message = messageBuilder.reject(
				config.getExchangeName('service'), 
				config.getQueueName('consume'), 
				0, 
				REASON_REJECTED
			).get();

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getExchangeName('delay'), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);
		});

		it('should send to GEE a message that was rejected and original route is not a string', function() {
			var NO_STRING = 12345;

			var message = messageBuilder
			.route(NO_STRING)
			.reject(
				config.getExchangeName('service'), 
				config.getQueueName('consume'), 
				1, 
				REASON_REJECTED
			).get();

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(),  
				NO_STRING, 
				message.content, 
				{headers: message.properties.headers}
			);

			expect(message.properties.headers._globalErrorReason).toBe(LogicErrorMessages.REASON_NOT_FOUND_ORIGINAL_ROUTE);
		});

		it('should send to GEE a message that wasn\'t rejected (unroutable message)', function() {
			var message = messageBuilder.get();

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);

			expect(message.properties.headers._globalErrorReason).toBe(LogicErrorMessages.REASON_NO_ROUTE);
		});

		it('should send to GEE a message that are deformed (no headers)', function() {
			var message = messageBuilder.get();

			delete message.properties.headers;

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_NO_HEADERS}}
			);
		});

		it('should send to GEE a message that are deformed (x-deaths is not an array)', function() {
			var message = messageBuilder.get();

			message.properties.headers['x-death'] = "No an array";

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: {"x-death": "No an array",_globalErrorReason: LogicErrorMessages.REASON_DEATHS_NO_ARRAY}}
			);
		});

		it('should send to GEE a message that are deformed (normalRejections not found)', function() {
			var message = messageBuilder.reject(
				"random string", 
				"other random string", 
				2, 
				REASON_REJECTED
			).get();

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);

			expect(message.properties.headers._globalErrorReason).toBe( LogicErrorMessages.REASON_NO_NORMAL_REJECTIONS);
		});

		it('should send to GEE a message that are deformed (no routing keys in x-death rejections)', function() {
			var message = messageBuilder.reject(
				config.getExchangeName('service'), 
				config.getQueueName('consume'), 
				2, 
				REASON_REJECTED
			).get();

			message.properties.headers['x-death'][0]['routing-keys'] = "No an array";

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);

			expect(message.properties.headers._globalErrorReason).toBe( LogicErrorMessages.REASON_NO_ROUTING_KEYS);
		});

		it('should send to GEE a message that are deformed (count is not a number in x-death)', function() {
			var message = messageBuilder.reject(
				config.getExchangeName('service'), 
				config.getQueueName('consume'), 
				2, 
				REASON_REJECTED
			).get();

			message.properties.headers['x-death'][0].count = "No a number";

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);

			expect(message.properties.headers._globalErrorReason).toBe( LogicErrorMessages.REASON_CORRUPTED_TOTAL_REJECTIONS);
		});

		it('should send to GEE a message that are deformed (count in x-death is a number in a string)', function() {
			var message = messageBuilder.reject(
				config.getExchangeName('service'), 
				config.getQueueName('consume'), 
				2, 
				REASON_REJECTED
			).get();

			message.properties.headers['x-death'][0].count = "1";

			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, message);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				DEFAULT_ROUTE, 
				message.content, 
				{headers: message.properties.headers}
			);

			expect(message.properties.headers._globalErrorReason).toBe( LogicErrorMessages.REASON_CORRUPTED_TOTAL_REJECTIONS);
		});

		it('should send to GEE a message that are deformed (number instead of message)', function() {
			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, 1);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				'', 
				new Buffer(''), 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_BAD_FORMED}}
			);
		});

		it('should send to GEE a message that are deformed (string instead of message)', function() {
			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, "Hola");

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				'', 
				new Buffer(''), 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_BAD_FORMED}}
			);
		});

		it('should send to GEE a message that are deformed (undefined instead of message)', function() {
			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				'', 
				new Buffer(''), 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_BAD_FORMED}}
			);
		});

		it('should send to GEE a message that are deformed (content is not a buffer)', function() {
			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, {content: "not a buffer"});

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				'', 
				new Buffer(''), 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_BAD_FORMED}}
			);
		});

		it('should send to GEE a message that are deformed (empty object)', function() {
			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, {});

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				'', 
				new Buffer(''), 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_BAD_FORMED}}
			);
		});

		it('should send to GEE a message that are deformed (regexp)', function() {
			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, /[^a]/);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				'', 
				new Buffer(''), 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_BAD_FORMED}}
			);
		});

		it('should send to GEE a message that are deformed (null)', function() {
			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, null);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				'', 
				new Buffer(''), 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_BAD_FORMED}}
			);
		});

		it('should send to GEE a message that are deformed (NaN)', function() {
			spyOn(amqpMock._methods.channel,'emit').and.callThrough();

			Logic.onMessage(channel, config, NaN);

			expect(amqpMock._methods.channel.emit).toHaveBeenCalledWith(
				config.getGlobalErrorExchangeName(), 
				'', 
				new Buffer(''), 
				{headers: {_globalErrorReason: LogicErrorMessages.REASON_BAD_FORMED}}
			);
		});
	});
});
