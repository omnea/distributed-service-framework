const path = require('path');
const glob = require('glob');

const appRoot = path.resolve(__dirname + "/../");

global.getAppPath = (relPath) => path.resolve(appRoot, relPath);

class RepositoryFactory {
	constructor() {
		this.factories = {};
		this.predefinedArguments = {};
		this._loadFiles();
	}

	get(name) {
		Array.prototype.shift.apply(arguments);
		Array.prototype.unshift.call(arguments, this);

		name = this._cleanPath(name);

		const Class = this._getClass(name);

		if(!Class) throw new Error('Factory ' + name + ' not found.');

		if(!this.predefinedArguments[name])
			return Class.create.apply(Class, arguments);

		const instancePromise = Class.create.apply(Class, [...arguments, ...this.predefinedArguments[name]]);

		//checking if the result is a promise
		if(Promise.resolve(instancePromise) === instancePromise)
			throw new Error('Factory ' + name + ' is not returning a promise. It must return a promise.');

		return instancePromise;
	}

	injectDependency(name, obj) {
		name = this._cleanPath(name);
		this.factories[name] = obj;
		
		if(arguments.length <= 2) return;

		const args = Array.prototype.slice.call(arguments, 2);

		this.predefinedArguments[name] = args;
	}

	_loadFiles() {
		const files = glob.sync(__dirname + '/factories/**/*.js');

		files.forEach(this._loadFile.bind(this));
	}

	_loadFile(fileRoute) {		
		const Class = require( path.resolve(fileRoute) );

		var relativePath = path.relative(__dirname + '/factories/', fileRoute);

		if(path.basename(relativePath) === 'index.js')
			relativePath = path.dirname(relativePath);

		relativePath = this._cleanPath(relativePath);

		this.factories[relativePath] = Class;
	}

	_cleanPath(path) {
		return path.replace(/[/\\]|\.js/gi, '');
	}

	_getClass(name) {
		if(!this.factories[name]) return null;
		return this.factories[name];
	}
}

const repositoryFactory = new RepositoryFactory();

module.exports.create = function (forceNew) {
	if(forceNew) return new RepositoryFactory();

	return repositoryFactory;
}; 
