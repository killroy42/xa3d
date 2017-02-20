(() => {

const uuid = require('portable-uuid');

class IdGenerator {
	constructor() {
		this._nextId = 0;
	}
	generateId() {
		const nextId = this._nextId;
		this._nextId++;
		return nextId;
	}
}

if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = IdGenerator;
}
})();