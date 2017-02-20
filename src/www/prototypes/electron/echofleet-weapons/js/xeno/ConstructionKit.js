(() => {
/* jshint validthis: true */
'use strict';

const make = (generator, args) => ({generator, args});

class ConstructionKit {
	constructor() {
		this._generators = {};
		this.make = ConstructionKit.make;
	}
	bindGenerator(generator, defaultContext) {
		return (args, context = defaultContext) => {
			return this.construct(make(generator, args), context);
		};
	}
	register(name, generator, context) {
		const {_generators} = this;
		if(typeof name === 'function') {
			generator = name;
			name = generator.name;
			context = generator;
		}
		return _generators[name] = this.bindGenerator(generator, context);
	}
	construct(val, context) {
		const {_generators} = this;
		if(typeof val !== 'object' || val.constructor !== Object) return val;
		if(typeof val.generator === 'function' || typeof _generators[val.generator] === 'function') {
			const args = this.construct(val.args, context);
			const generator = (typeof val.generator === 'string')?_generators[val.generator]:val.generator;
			const res = generator(args, context);
			return this.construct(res, context);
		} else {
			const args = {};
			for(var key in val) args[key] = this.construct(val[key], context);
			return args;
		}
	}
}
ConstructionKit.make = make;


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = ConstructionKit;
}
})();