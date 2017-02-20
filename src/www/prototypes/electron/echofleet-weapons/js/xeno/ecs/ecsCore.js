(() => {
const {Entity} = require('XenoECS');

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

class Node {
	constructor() {
		this._parent = undefined;
		this._children = [];
		Object.defineProperties(this, {
			parent: {get: () => this._parent},
			children: {get: () => this._children},
		});
	}
	OnDestroy(entity) {
		//console.info('Node.OnDestroy(entity);', this.entity.id);
		this.detach();
	}
	attach(childNode) {
		//console.info('Node[%s].attach(childNode);', this.entity.id, childNode);
		if(Array.isArray(childNode)) {
			childNode.forEach(childNode => this.attach(childNode));
			return;
		}
		if(childNode.entity instanceof Entity) childNode = childNode.entity;
		if(childNode instanceof Entity) {
			if(!childNode.hasComponent(Node)) childNode.addComponent(Node);
			childNode = childNode.node;
		}
		if(!(childNode instanceof Node)) throw new Error('childNode is not a Node');
		childNode.detach();
		childNode._parent = this;
		this._children.push(childNode);
		if(childNode.entity.transform && this.entity.transform) {
			this.entity.transform.add(childNode.entity.transform);
		}
		return this;
	}
	detach(childNode) {
		if(childNode === undefined) {
			if(this._parent !== undefined) this._parent.detach(this);
			return this;
		}
		//console.info('Node.detach(childNode);', this.entity.id);
		if(childNode.entity instanceof Entity) childNode = childNode.entity;
		if(childNode instanceof Entity) childNode = childNode.node;
		const idx = this._children.indexOf(childNode);
		if((childNode._parent !== this) || (idx === -1)) {
			throw new Error('childNode is not a child of this node');
		}
		if(childNode.entity.transform &&
			this.entity.transform &&
			childNode.entity.transform.parent === this.entity.transform) {
			this.entity.transform.remove(childNode.entity.transform);
		}
		childNode._parent = undefined;
		this._children.splice(idx, 1);
	}
	findComponents(Component) {
		//console.info('Node.findComponent("%s");', Component.name || Component);
		return [].concat.apply([], this.children.map(node => {
			const components = node.findComponents(Component);
			const component = node.entity.getComponent(Component);		
			if(component) components.push(component);
			return components;
		}));
	}
	fromJSON(json = {}) {
		//console.info('Node.fromJSON(json);', this.entity.id);
		const {entities, _children} = this;
		const {children = []} = json;
		[..._children].forEach(({entity}) => entity.destroy());
		children.forEach(json => {
			const child = entities.createEntity(json);
			//child.addComponent(Node);
			//this.attach(child.node);
			this.attach(child);
		});
	}
	toJSON() {
		const {_children} = this;
		const json = {};
		//if(this._parent) json.parent = this._parent.entity.id;
		if(_children.length > 0) json.children = _children.map(({entity}) => {
			const json = entity.toJSON().components;
			delete json.node;
			return json;
		});
		return json;
	}
}

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		DataComponent,
		Node,
	};
	module.exports.ecsCore = module.exports;
}
})();