module.exports = class Router {
	constructor() {
		this._routes = new Map();
	}

	add(service, route, value){
		if(typeof value === "undefined")
			throw new Error("The value to save in the route must be defined.");

		if(typeof route === "undefined")
			throw new Error("The route must be defined.");

		if(typeof service === "undefined")
			throw new Error("The service must be defined.");

		if(!this._routes.has(service))
			this._routes.set(service, new Map());

		var compiledRoute = this.compileRoute(route);

		this.remove(service, route, value);

		this._routes.get(service).set(compiledRoute, {route: route, value: value});
	}

	remove(service, route, value) {
		if(!this._routes.has(service))
			return;

		var routes = this._routes.get(service);

		Array.from(routes.entries())
		.filter(([, item]) => {
			if(item.route === route && item.value === value)
				return true;
			return false;
		}).forEach(([key]) => routes.delete(key));
	}

	get(service, route){
		if(!this._routes.has(service))
			return null;

		var routes = this._routes
		.get(service)
		.entries();

		var selected = Array.from(routes)
		.filter(([check]) => {
			var result = check.exec(route);
			if(!Array.isArray(result) || result[0] !== route)
				return false;
			return true;
		})
		.pop();

		if(!selected)
			return null;

		return selected[1].value;
	}

	compileRoute(route){
		var items = route.split('.');

		var check = "";

		for(let item of items){
			switch(item){
				case '#': //Zero or more occurences of anything. (The \\ is translated in the string to only one \)
					check += '.*';
				break;
				case '*': //Any group of character that is not a dot or hash
					check += '[^\\.#]+\\.';
				break;
				default: // The item plus a dot
					check += item + '\\.';
				break;
			}
		}

		if(check[check.length-1] === '.') //If the last character is a dot, delete the dot check
			check = check.substring(0, check.length - 2);

		return new RegExp(check);
	}
};
