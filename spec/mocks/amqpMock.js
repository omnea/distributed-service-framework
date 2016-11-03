exports.mock = function () {
	var _methods = {};
	
	return {
		_methods: _methods,
		create: function () {
			var connection = {
				connect:  () => Promise.resolve(connection),
				channel:  () => Promise.resolve(channel)
			};

			var channel = {
				exchange: () => Promise.resolve("testExchange"),
				queue:    () => Promise.resolve("testQueue"),
				bind:     () => Promise.resolve(),
				close:    () => Promise.resolve(),
				consume:  () => Promise.resolve(),
			};

			_methods.connection = connection;
			_methods.channel = channel;
			
			return connection;
		}
	};
};

