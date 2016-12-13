var uuid = require('node-uuid').v4;

exports.mock = function (config) {
	var _methods = {};
	var mockHelpers = {};
	config = config ? config : {};

	var id = uuid();
	var consumeFunction = null;

	return {
		_methods: _methods,
		mockHelpers: mockHelpers,
		create: function () {
			var connection = {
				connect:  () => Promise.resolve(connection),
				channel:  () => {
					if(config.channel_error)
						throw new Error();
					return Promise.resolve(channel);
				},
				close:  () => Promise.resolve(),
			};

			var channel = {
				exchange:      () => Promise.resolve("testExchange"),
				checkExchange: () => Promise.resolve(),
				queue:         () => Promise.resolve("testQueue"),
				checkQueue:    () => Promise.resolve(),
				bindQueue:     () => Promise.resolve(),
				unbindQueue:   () => Promise.resolve(),
				close:         () => Promise.resolve(),
				cancel:        () => Promise.resolve(),
				ack:           () => Promise.resolve(),
				reject:        () => Promise.resolve(),
				emit:          () => Promise.resolve(),
				consume:       (_, callback) => {
					if(config.consume_error) throw new Error();

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

