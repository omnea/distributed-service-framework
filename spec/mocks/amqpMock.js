var uuid = require('node-uuid').v4;

exports.mock = function () {
	var _methods = {};
	var mockHelpers = {};

	var id = uuid();
	var consumeFunction = null;

	return {
		_methods: _methods,
		mockHelpers: mockHelpers,
		create: function () {
			var connection = {
				connect:  () => Promise.resolve(connection),
				channel:  () => Promise.resolve(channel),
				close:  () => Promise.resolve(),
			};

			var channel = {
				exchange: () => Promise.resolve("testExchange"),
				queue:    () => Promise.resolve("testQueue"),
				bindQueue:() => Promise.resolve(),
				close:    () => Promise.resolve(),
				cancel:   () => Promise.resolve(),
				ack:      () => Promise.resolve(),
				reject:   () => Promise.resolve(),
				emit:     () => Promise.resolve(),
				consume:  (_, callback) => {
					consumeFunction = callback;
					return Promise.resolve("3408c524309c57n2105");
				}
			};

			_methods.connection = connection;
			_methods.channel = channel;
			mockHelpers.publish = ((service, route, content) => {
				consumeFunction({
					content: content,
					fields: {
						exchange: service,
						routingKey: route
					},
					properties: {},
					_mock_uuid: id
				});
			});
			
			return Promise.resolve(connection);
		}
	};
};

