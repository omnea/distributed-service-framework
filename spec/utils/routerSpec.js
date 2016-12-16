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
			var service = "Service";
			var route = "route";

			router.add(service, route, value);
			var returned = router.get(service, route);

			expect(returned).toBe(value);
		});

		it('should return null if the route do not matchs', function() {
			var service = "Service";
			var route = "route";

			router.add(service, route, "blebleble");
			var returned = router.get(service, "blabla");

			expect(returned).toBe(null);
		});

		it('should return the last value if more than one value are inserted for the same route', function() {
			var service = "Service";
			var route = "route";

			router.add(service, route, "callback1");
			router.add(service, route, "callback2");
			router.add(service, route, "callback3");
			var returned = router.get(service, route);

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
			expect(() => router.add("Service", undefined, "value")).toThrow();
		});

		it('should throw error is the service is not defined', function() {
			expect(() => router.add(undefined, "route", "value")).toThrow();
		});

		it('shouldn\'t get the route is there are different services', function() {
			var route = "route";

			router.add("Service1", route, "value");

			expect(router.get("Service2", route)).not.toBe("value");
		});

		it('should recognize rabbitmq patterns: route.*.subroute', function () {
			var service = "Service";

			router.add(service, "route.*.subroute", "ValueA");

			expect(router.get(service, "route.hello.subroute")).toBe("ValueA");
			expect(router.get(service, "routes.hello.subroute")).not.toBe("ValueA");
			expect(router.get(service, "route.hello.subroutessss")).not.toBe("ValueA");
			expect(router.get(service, "route.hello.b.subroute")).not.toBe("ValueA");
		});

		it('should recognize rabbitmq patterns: route.*.*.other', function () {
			var service = "Service";
			
			router.add(service, "route.*.*.other", "ValueB");

			expect(router.get(service, "route.hello.subroute.other")).toBe("ValueB");
			expect(router.get(service, "route.subroute.other")).not.toBe("ValueB");
			expect(router.get(service, "route..subroute.other")).not.toBe("ValueB");
		});

		it('should recognize rabbitmq patterns: partial.#.*.other.*.hello', function () {
			var service = "Service";
			
			router.add(service, "partial.#.*.other.*.hello", "ValueC");

			expect(router.get(service, "partial.hash.hash.hash.hash.wildcard.other.wildcard.hello")).toBe("ValueC");
			expect(router.get(service, "partial.hash.hash.hash.hash.wildcard.other.another.wildcard.hello")).not.toBe("ValueC");
			expect(router.get(service, "partial.hash.hash.hash.hash.wildcard.other.wildcard")).not.toBe("ValueC");
		});

		it('should recognize rabbitmq patterns: text.#', function () {
			var service = "Service";
			
			router.add(service, "text.#", "ValueD");

			expect(router.get(service, "text.oute.hello.subroute.other")).toBe("ValueD");
			expect(router.get(service, "notText.oute.hello.subroute.other")).not.toBe("ValueD");
		});

		it('should recognize rabbitmq patterns: message.hello.*', function () {
			var service = "Service";
			
			router.add(service, "message.hello.*", "ValueE");

			expect(router.get(service, "message.hello.other")).toBe("ValueE");
			expect(router.get(service, "message.hello.other.other")).not.toBe("ValueE");
			expect(router.get(service, "message.hello")).not.toBe("ValueE");
		});

		it('should recognize rabbitmq patterns: *', function () {
			var service = "Service";
			
			router.add(service, "*", "ValueF");

			expect(router.get(service, "other")).toBe("ValueF");
			expect(router.get(service, "other.other")).not.toBe("ValueF");
			expect(router.get(service, "")).not.toBe("ValueF");
		});

		it('should recognize rabbitmq patterns: gil.hola.#', function () {
			var service = "Service";
			
			router.add(service, "gil.hola.#", "ValueG");

			expect(router.get(service, "gil.hola.text.oute.hello.subroute.other")).toBe("ValueG");
			expect(router.get(service, "gil.adios.hola.text.oute.hello.subroute.other")).not.toBe("ValueG");
		});

		it('should recognize rabbitmq patterns: gil.hola.#', function () {
			var service = "Service";
			
			router.add(service, "*.hola.#", "ValueG");

			expect(router.get(service, "gil.hola.text.oute.hello.subroute.other")).toBe("ValueG");
			expect(router.get(service, "hola.text.oute.hello.subroute.other")).not.toBe("ValueG");
		});

		it('should match any route if there are a hash', function () {
			var service = "Service";

			router.add(service, "#", "valueG");
			expect(router.get(service, "abc.abc.abc.abc.abc")).toBe("valueG");
			expect(router.get(service, "")).toBe("valueG");
		});

		it('should return the last value if more than one pattern match the route', function() {
			var service = "Service";

			router.add(service, "#", "callback1");
			router.add(service, "*.*", "callback2");
			router.add(service, "hola.#", "callback3");

			var returned = router.get(service, "hola.adios");
			expect(returned).toBe("callback3");
			
			router.add(service, "*.*", "callback2");

			returned = router.get(service, "hola.adios");
			expect(returned).toBe("callback2");
			
			router.add(service, "#", "callback1");

			returned = router.get(service, "hola.adios");
			expect(returned).toBe("callback1");
		});

		it('should not return the value after delete', function () {
			var service = "Service";

			router.add(service, "hola.hola", "valueG");
			expect(router.get(service, "hola.hola")).toBe("valueG");
			
			router.remove("Service", "hola.hola", "valueG");
			expect(router.get(service, "hola.hola")).not.toBe("valueG");
		});

		it('should return the correct value after executing remove in the same route but different service', function () {
			var service = "Service";

			router.add(service, "hola.hola", "valueG");
			expect(router.get(service, "hola.hola")).toBe("valueG");
			
			router.remove("no-service", "hola.hola", "valueG");
			expect(router.get(service, "hola.hola")).toBe("valueG");
		});

		it('should return the last - non deleted - value if more than one pattern match the route', function () {
			var service = "Service";

			router.add(service, "#", "callback1");
			router.add(service, "*.*", "callback2");
			router.add(service, "hola.#", "callback3");

			var returned = router.get(service, "hola.adios");
			expect(returned).toBe("callback3");

			router.remove("Service", "hola.#", "callback3");

			returned = router.get(service, "hola.adios");
			expect(returned).toBe("callback2");

			router.remove("Service", "*.*", "callback2");

			returned = router.get(service, "hola.adios");
			expect(returned).toBe("callback1");
		});
	});
});
