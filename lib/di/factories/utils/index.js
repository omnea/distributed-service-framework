exports.create = function (di) {
	return Promise.all([
		di.get('utils/errorMessages'),
		di.get('utils/router')
	]).then(([errorMessages, router]) => {
		return {errorMessages, router};
	});
};
