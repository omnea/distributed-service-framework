var di = require(__dirname + '/../../lib/di/di').create();

var amqplibMock = require('../mocks/amqplibMock').mock();

describe('Utils', function() {
	describe('Router', function() {
		var router;

		beforeEach(function(done) {
			di.get('utils/router')
			.then(instance => router = instance)
			.then(done)
			.catch(err => {
				console.log(err);
				done(err);
			});
		});

		it('should return the correct value if the route matchs', function() {
			var value = "callback";

			router.add("Service", "route", "callback");
			var returned = router.get("Service", "route");

			expect(returned).toBe(value);
		});

		it('should return null if the route do not matchs', function() {
			var value = "callback";

			router.add("Service", "route", "callback");
			var returned = router.get("Service", "blabla");

			expect(returned).toBe(null);
		});

		it('should return the last value if more than one value are inserted for the same route', function() {

			router.add("Service", "route", "callback1");
			router.add("Service", "route", "callback2");
			router.add("Service", "route", "callback3");
			var returned = router.get("Service", "route");

			expect(returned).toBe("callback3");
		});

		it('should throw error is the callback is not defined', function() {
			var error = false;
			try{
				router.add("Service1", "route");
			}catch(e){
				error = true;
			}

			expect(error).toBe(true);
		});

		it('should throw error is the route is not defined', function() {
			var error = false;
			try{
				router.add("Service1", undefined, "value");
			}catch(e){
				error = true;
			}

			expect(error).toBe(true);
		});

		it('should throw error is the route is not defined', function() {
			var error = false;
			try{
				router.add(undefined, "route", "value");
			}catch(e){
				error = true;
			}

			expect(error).toBe(true);
		});

		it('shouldn\'t get the route is there are different services', function() {
			router.add("Service1", "route", "value");

			expect(router.get("Service2", "route")).not.toBe("value");
		});

		it('should recognize rabbitmq patterns: route.*.subroute', function () {
			router.add("Service", "route.*.subroute", "ValueA");

			expect(router.get("Service", "route.hello.subroute")).toBe("ValueA");
			expect(router.get("Service", "routes.hello.subroute")).not.toBe("ValueA");
			expect(router.get("Service", "route.hello.subroutessss")).not.toBe("ValueA");
			expect(router.get("Service", "route.hello.b.subroute")).not.toBe("ValueA");
		});

		it('should recognize rabbitmq patterns: route.*.*.other', function () {
			router.add("Service", "route.*.*.other", "ValueB");

			expect(router.get("Service", "route.hello.subroute.other")).toBe("ValueB");
			expect(router.get("Service", "route.subroute.other")).not.toBe("ValueB");
			expect(router.get("Service", "route..subroute.other")).not.toBe("ValueB");
		});

		it('should recognize rabbitmq patterns: partial.#.*.other.*.hello', function () {
			router.add("Service", "partial.#.*.other.*.hello", "ValueC");

			expect(router.get("Service", "partial.hash.hash.hash.hash.wildcard.other.wildcard.hello")).toBe("ValueC");
			expect(router.get("Service", "partial.hash.hash.hash.hash.wildcard.other.another.wildcard.hello")).not.toBe("ValueC");
			expect(router.get("Service", "partial.hash.hash.hash.hash.wildcard.other.wildcard")).not.toBe("ValueC");
		});

		it('should recognize rabbitmq patterns: text.#', function () {
			router.add("Service", "text.#", "ValueD");

			expect(router.get("Service", "text.oute.hello.subroute.other")).toBe("ValueD");
			expect(router.get("Service", "notText.oute.hello.subroute.other")).not.toBe("ValueD");
		});

		it('should recognize rabbitmq patterns: message.hello.*', function () {
			router.add("Service", "message.hello.*", "ValueE");

			expect(router.get("Service", "message.hello.other")).toBe("ValueE");
			expect(router.get("Service", "message.hello.other.other")).not.toBe("ValueE");
			expect(router.get("Service", "message.hello")).not.toBe("ValueE");
		});

		it('should recognize rabbitmq patterns: *', function () {
			router.add("Service", "*", "ValueF");

			expect(router.get("Service", "other")).toBe("ValueF");
			expect(router.get("Service", "other.other")).not.toBe("ValueF");
			expect(router.get("Service", "")).not.toBe("ValueF");
		});

		it('should recognize rabbitmq patterns: gil.hola.#', function () {
			router.add("Service", "gil.hola.#", "ValueG");

			expect(router.get("Service", "gil.hola.text.oute.hello.subroute.other")).toBe("ValueG");
			expect(router.get("Service", "gil.adios.hola.text.oute.hello.subroute.other")).not.toBe("ValueG");
		});

		it('should recognize rabbitmq patterns: gil.hola.#', function () {
			router.add("Service", "*.hola.#", "ValueG");

			expect(router.get("Service", "gil.hola.text.oute.hello.subroute.other")).toBe("ValueG");
			expect(router.get("Service", "hola.text.oute.hello.subroute.other")).not.toBe("ValueG");
		});

		it('should match any route if there are a hash', function () {

			router.add("Service", "#", "valueG");
			expect(router.get("Service", "abc.abc.abc.abc.abc")).toBe("valueG");
			expect(router.get("Service", "")).toBe("valueG");
		});

		it('should return the last value if more than one pattern match the route', function() {

			router.add("Service", "#", "callback1");
			router.add("Service", "*.*", "callback2");
			router.add("Service", "hola.#", "callback3");

			var returned = router.get("Service", "hola.adios");
			expect(returned).toBe("callback3");
			
			router.add("Service", "*.*", "callback2");

			returned = router.get("Service", "hola.adios");
			expect(returned).toBe("callback2");
			
			router.add("Service", "#", "callback1");

			returned = router.get("Service", "hola.adios");
			expect(returned).toBe("callback1");
		});

		it('should not return the value after delete', function () {

			router.add("Service", "hola.hola", "valueG");
			expect(router.get("Service", "hola.hola")).toBe("valueG");
			
			router.remove("Service", "hola.hola", "valueG");
			expect(router.get("Service", "hola.hola")).not.toBe("valueG");
		});

		it('should return the last - non deleted - value if more than one pattern match the route', function () {

			router.add("Service", "#", "callback1");
			router.add("Service", "*.*", "callback2");
			router.add("Service", "hola.#", "callback3");

			var returned = router.get("Service", "hola.adios");
			expect(returned).toBe("callback3");

			router.remove("Service", "hola.#", "callback3");

			returned = router.get("Service", "hola.adios");
			expect(returned).toBe("callback2");

			router.remove("Service", "*.*", "callback2");

			returned = router.get("Service", "hola.adios");
			expect(returned).toBe("callback1");
		});
	});
});
