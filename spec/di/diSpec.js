var DI = require(__dirname + '/../../lib/di/di').create();

describe('Depedency injector', function() {

	var DI, di;

	beforeEach(function() {
		DI = require(__dirname + '/../../lib/di/di');
		di = DI.create(true);
	});

	it('should load dependencies', function(done) {
		di.get('connectors/amqplib')
		.then(obj => {
			expect(obj).toBe(require("amqplib"));
			done();
		})
		.catch(e => console.log(e));
	});

	it('trown error in case of not found dependecy', function() {
		expect(() => di.get('sdadsd/sdfdffsd')).toThrow();
	});

	it('is able to inject a dependency', function(done) {
		var di = DI.create(true);
		var diResponse = 'Hello! :D';

		di.injectDependency('hello/world', {create: () => Promise.resolve(diResponse)});

		di.get('hello/world')
		.then(dependency => {
			expect(dependency).toBe(diResponse);
			done();
		});
	});

	it('is able to inject a dependency with predefined arguments', function(done) {
		var di = DI.create(true);
		var argument = 'Hello! :D';

		di.injectDependency('hello/world', {create: function (di, a1) {
			expect(a1).toBe(argument);
			done();
		}}, argument);

		di.get('hello/world');
	});

	it('should throw and error if the factory don\t return a promise', function() {
		var di = DI.create(true);

		di.injectDependency('hello/world', {create: function () { return 'hola'; }});

		expect(() => di.get('hello/world')).toThrow();
	});

	it('should return a folder if there is an index.js', function() {
		di.get('utils').then(instances => {
			expect(typeof instances).toBe('object');
		});
	});
});
