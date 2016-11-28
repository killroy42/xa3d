(() => {
const {makeComponent} = require('XenoECS');

class DataComponent {
	constructor() {
		const props = {};
		const set = (key, val) => {
			//console.error('set > set(%s, %s)', key, val);
			const update = {};
			if(typeof key === 'object') {
				val = key;
				for(key in val) if(val[key] !== props[key]) update[key] = val[key];
			} else {
				if(val !== props[key]) update[key] = val;
			}
			if(Object.keys(update).length > 0) {
				const prev = Object.assign({}, props);
				Object.assign(props, update);
				this.entity.dispatchEvent(DataComponent.EVENT_DATACHANGED, update, prev, this);
			}
			return this;
		};
		const createProp = (name, initialValue) => {
			Object.defineProperty(this, name, {
				get: () => props[name],
				set: (val) => set(name, val)
			});
			initProp(name, initialValue);
		};
		const initProp = (name, initialValue) => props[name] = initialValue;
		const toString = () => `${this.constructor.name}[${Object.keys(props).map(key => `${key}: ${props[key]}`).join('; ')}]`;
		const fromJSON = (nextProps) => set(nextProps);
		const toJSON = () => Object.assign({}, props);
		Object.defineProperties(this, {
			initProp: {value: initProp},
			createProp: {value: createProp},
			set: {value: set},
			//refresh: {value: refresh},
			toString: {value: toString, configurable: true, enumerable: true},
			fromJSON: {value: fromJSON, configurable: true, enumerable: true},
			toJSON: {value: toJSON, configurable: true, enumerable: true},
		});
	}
}
DataComponent.EVENT_DATACHANGED = 'datachanged';


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		DataComponent,
	};
	module.exports.ecsCore = module.exports;
}
})();