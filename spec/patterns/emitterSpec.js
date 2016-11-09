var di = require(__dirname + '/../../lib/di/di').create();

describe('Patterns', function() {
	describe('Emitter', function() {
		describe('getAllMessages', function() {

			var emitter;

			beforeEach(function(done) {
				di.get('patterns/emitter').then(instance => emitter = instance)
				.then(done)
				.catch(err => console.log(err));
			});


			it('should return an iterator', function() {
				var data = "Data";
				var route = "Route";

				emitter.emit(route, data);
				var messages = emitter.getAllMessages();

				expect(messages).not.toBe(undefined);
				expect(messages).not.toBe(null);
				expect(Symbol.iterator in Object(messages)).toBe(true);
			});

			it('should return an iterator with the emitted messages', function() {
				var data = {route: Math.random(), content: Math.random()};

				emitter.emit(data.route, data.content);

				var messages = Array.from(emitter.getAllMessages());
				
				expect(messages.length).toBe(1);
				expect(messages[0]).toEqual(data);
			});

			it('should return an iterator with all the emitted messages in order', function() {
				var length = Math.floor(Math.random() * 100) + 50;

				var datas = Array(length).fill(0).map(_ => {
					return {route: Math.random(), content: Math.random()};
				});

				datas.forEach(data => 
					emitter.emit(data.route, data.content)
				);

				var messages = Array.from(emitter.getAllMessages());
				
				expect(messages.length).toBe(length);

				datas.forEach((data, index) => 
					expect(messages[index]).toEqual(data)
				);
			});
		});
	});
});
