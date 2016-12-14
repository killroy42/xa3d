(() => {
/* jshint validthis: true */
'use strict';
const EventDispatcher = require('EventDispatcher');


const componentToJSON = function() {
	return {_component: this.constructor.name};
};

const wrapToJson = (instance) => {
	const {toJSON} = instance;
	return () => Object.assign(componentToJSON.call(instance), toJSON.call(instance));
};

const componentFromJSON = function(json) {
	return this;
};

const componentToString = function() {
	//console.info('componentToString();', this.constructor.name);
	const json = this.toJSON();
	const componentName = json._component;
	delete json._component;
	return `${componentName}[${JSON.stringify(json)}]`;
};

const getComponentName = (Component) => {
	if(Component === undefined) throw new Error('Component is undefined in getComponentName(Component)');
	if(typeof Component === 'string') return Component;
	if(typeof Component.name === 'string') return Component.name;
	return Component.toString().replace(/.*?class (\w+).*/, '$1');
};

const getComponentPropertyName = (Component) => {
	const name = getComponentName(Component);
	return name.charAt(0).toLowerCase() + name.slice(1);
};



class Entity {
	constructor(entities, id) {
		EventDispatcher.apply(this);
		Object.defineProperties(this, {
			id: {value: id, writable: false, enumerable: true},
			_manager: {value: entities, writable: false, enumerable: true},
			entities: {value: entities, writable: false, enumerable: true},
			_Components: {value: [], writable: false, enumerable: true},
			_components: {value: {}, writable: false, enumerable: true},
			_tags: {value: [], writable: false, enumerable: true},
		});
	}
	getManager() {

		return this.entities;
	}
	addComponent(Component, opts) {
		this.entities.entityAddComponent(this, Component, opts);
		return this;
	}
	addComponents(Components) {
		this.entities.entityAddComponents(this, Components);
		return this;
	}
	removeComponent(Component) {
		this.entities.entityRemoveComponent(this, Component);
		return this;
	}
	removeAllComponents() {
		const {_Components} = this;
		while(_Components.length > 0) this.removeComponent(_Components[_Components.length - 1]);
		return this;
	}
	getComponent(Component) {
		//console.info('Entity.getComponent(Component);', Component.name || Component);
		const {entities, _Components, _components} = this;
		if(_Components.length === 0) return undefined;
		const component = _components[getComponentName(Component)];
		if(component !== undefined) return component;
		if(typeof Component === 'string') Component = entities.resolveComponent(Component);
		if(typeof Component.isPrototypeOf !== 'function') return undefined;
		const ClassMatch = _Components.find(C => Component.isPrototypeOf(C));
		if(ClassMatch === undefined) return undefined;
		return _components[ClassMatch.name];
	}
	hasComponent(Component) {
		return this.getComponent(Component) !== undefined;
		//console.group('Entity.hasComponent');
		//console.info('Entity.hasComponent(Component);', Component.name || Component);
		//const component = this.getComponent(Component);
		/*
		const {_Components, _components} = this;
		const name = Component.name || Component;
		console.error('Case A:', _components[name] !== undefined);
		if(_components[name] !== undefined) return true;
		_Components.forEach(C => {
			console.error(C);
			console.log(C === Component);
			console.log(Component.isPrototypeOf);
			console.log(Component.isPrototypeOf(C));
		});
			//(C === Component) ||
			//(Component.isPrototypeOf && Component.isPrototypeOf(C))
		//);
		*/
		//console.groupEnd('Entity.hasComponent');
		//return false;
		//throw new Error('hasComponent not implemented');
		//Component = this.resolveComponent(Component);
		//if(Component === undefined) return false;
		//return this._components[Component.name] !== undefined;
		//return this._Components[Component];
		//return this.getComponentClass(Component) !== undefined;
	}
	requireComponent(Component) {
		//console.group('Entity.requireComponent');
		//console.info('Entity.requireComponent(Component);', Component.name || Component);
		if(!this.hasComponent(Component)) this.addComponent(Component);
		const component = this.getComponent(Component);
		//console.groupEnd('Entity.requireComponent');
		return component;
	}
	hasAllComponents(Components) {
		for(var i = 0; i < Components.length; i++)
			if(!this.hasComponent(Components[i]))
				return false;
		return true;
	}
	addTag(tag) {
		const {_tags} = this;
		_tags.push(tag);
		return this;
	}
	hasTag(tag) {
		const {_tags} = this;
		return _tags.indexOf(tag) !== -1;
	}
	hasAllTags(tags) {
		for(var i = 0; i < tags.length; i++) {
			if(!this.hasTag(tags[i])) return false;
		}
		return true;
	}
	destroy() {
		this.entities.removeEntity(this);
	}
	update(...args) {
		//console.trace('Entity.update(%s);', JSON.stringify(...args));
		this._Components.forEach((Component) => {
			const c = this.getComponent(Component);
			if(c.OnUpdate) c.OnUpdate(...args);
		});
	}
	componentToString(Component) {
		return (Component.prototype.toString &&
			Component.prototype.toString !== Object.prototype.toString)
				?this.getComponent(Component).toString()
				:Component.name;
	}
	fromJSON(json) {
		this.addComponents(json.components);
	}
	toJSON() {
		const {id, _components} = this;
		const components = {};
		Object.keys(_components).forEach(name => {
			components[name] = _components[name].toJSON();
			delete components[name]._component;
		});
		return {id, components};
	}
	toString() {
		const {id, _Components} = this;
		return `Entity(${id})\n${
			_Components
				.map(C => `  * ${this.getComponent(C).toString()}`)
				.join('\n')
		}`;
	}
}
Entity.isEntity = (entity) => {
	
};

class System {
	constructor() {
		EventDispatcher.apply(this);
		this._manager = null;
		this._Components = [];
	}
	setManager(manager) { this._manager = manager; return this; }
	setMaker(makerFunc) { this._makerFunc = makerFunc; return this; }
	setComponents(Components) { this._Components = Components; return this; }
	getEntities() {
		return this._manager.queryComponents(this._Components);
	}
	removeAllEntities() {
		const {_manager} = this;
		this.getEntities().forEach(entity => _manager.removeEntity(entity));
	}
	create(args) {
		const bareEntity = this._manager.createEntity();
		const entity = this._makerFunc(args, bareEntity);
		return entity;
	}
	remove(entity) {
		this._manager.removeEntity(entity);
	}
}
System.getPropertyName = function getPropertyName() {
	return getComponentPropertyName(this);
};

class EntityManager {
	constructor() {
		EventDispatcher.apply(this);
		this._entities = [];
		this._Components = {};
		this.__nextEntityId = 0;
		Object.defineProperties(this, {
			all: {value: this._entities, writable: false, enumerable: true},
		});
	}
	getNextEntityId() {
		return this.__nextEntityId++;
	}
	registerComponent(Component) {
		//console.info('EntityManager.registerComponent(Component);', getComponentName(Component));
		const {_Components} = this;
		if(Array.isArray(Component)) return this.registerComponents(Component);
		const name = getComponentName(Component);
		if(typeof Component !== 'function') {
			throw new Error(`Not a valid Component for registration. name: "${name}", type: [${typeof Component}]`);
		}
		if(_Components[name] !== undefined) {
			console.warn('Component "%s" already registered', name);
		}
		_Components[name] = Component;
		return this;
	}
	registerComponents(components) {
		components.forEach((component) => {
			if(component === undefined) {
				const err = new Error('undefined value in registerComponents(components)');
				console.error(err);
				console.log('components:\n', components);
				throw err;
			}
		});
		components.forEach((component) => this.registerComponent(component));
		return this;
	}
	resolveComponent(Component) {
		//console.info('EntityManager.resolveComponent(Component);', getComponentName(Component));
		const {_Components} = this;
		const name = getComponentName(Component);
		if(!_Components[name]) this.registerComponent(Component);
		return _Components[name];
	}
	createEntity(Components) {
		//console.info('EntityManager.createEntity(Components);', Object.keys(Components));
		const {_entities} = this;
		const entity = new Entity(this, this.getNextEntityId());
		_entities.push(entity);
		this.entityAddComponents(entity, Components);
		return entity;
	}
	removeEntity(entity) {
		//console.info('EntityManager.removeEntity(entity);');
		const {_entities} = this;
		
		entity.dispatchEvent({type: EntityManager.EVENT_DESTROYENTITY, entity});

		Object.keys(entity._components)
			.map(name => entity._components[name])
			.forEach(c => (typeof c.OnDestroy === 'function')?c.OnDestroy():null);

		entity.removeAllComponents();
		_entities.splice(_entities.indexOf(entity), 1);
		//entity.entities = null;
		return this;
	}
	instantiateComponent(entity, Component) {
		//console.info('EntityManager.instantiateComponent(entity, Component);', getComponentName(Component));
		const instance = Object.defineProperties(new Component(), {
			entities: {value: this, configurable: false, writable: false, enumerable: true},
			entity: {value: entity, configurable: false, writable: false, enumerable: true},
			_entity: {value: entity, configurable: false, writable: false, enumerable: true},
		});
		if(typeof instance.toJSON !== 'function') {
			Object.defineProperty(instance, 'toJSON', {
				value: componentToJSON,
				configurable: true, writable: true, enumerable: true
			});
		} else {
			Object.defineProperty(instance, 'toJSON', {
				value: wrapToJson(instance),
				configurable: true, writable: true, enumerable: true
			});
		}
		if(typeof instance.fromJSON !== 'function') {
			Object.defineProperty(instance, 'fromJSON', {
				value: componentFromJSON,
				configurable: true, writable: true, enumerable: true
			});
		}
		if(instance.hasOwnProperty('toString') === false) {
			Object.defineProperty(instance, 'toString', {
				value: componentToString,
				configurable: true, writable: true, enumerable: true
			});
		}
		return instance;
	}
	entityAddComponent(entity, Component, opts) {
		//console.info('EntityManager.entityAddComponent(entity, Component, opts);');
		Component = this.resolveComponent(Component);
		if(typeof Component === 'string') throw new Error(`Component not found: "${Component}"`);
		if(entity.hasComponent(Component)) {
			return this;
		}
		const propName = getComponentPropertyName(Component);
		const component = this.instantiateComponent(entity, Component);
		if(entity[propName] !== undefined) throw new Error(`Component name collision for "${propName}"`);
		entity._Components.push(Component);
		const name = getComponentName(Component);
		entity._components[name] = component;
		entity[propName] = component;
		if(component.OnAttachComponent) component.OnAttachComponent(entity);
		this.dispatchEvent({type: EntityManager.EVENT_ADDCOMPONENT, entity, Component});
		if(opts) component.fromJSON(opts);
		return this;
	}
	entityAddComponents(entity, Components) {
		//console.info('EntityManager.entityAddComponents(entity, Components);', Object.keys(Components));
		if(Array.isArray(Components)) {
			Components.forEach(C => this.entityAddComponent(entity, C));
		} else if(typeof Components === 'object') {
			const componentNames = Object.keys(Components);
			componentNames.forEach(C => this.entityAddComponent(entity, C));
			componentNames.forEach(C => entity.getComponent(C).fromJSON(Components[C]));
		}
		return this;
	}
	entityRemoveComponent(entity, Component) {
		//console.info('EntityManager.entityRemoveComponent(entity, Component);');
		const component = entity.getComponent(Component);
		if(component === undefined) {
			return this;
		}
		Component = component.constructor;
		const cName = getComponentPropertyName(Component);
		this.dispatchEvent({type: EntityManager.EVENT_REMOVECOMPONENT, entity, component});
		if(component.OnDetachComponent) component.OnDetachComponent(entity);
		entity._Components.splice(entity._Components.indexOf(Component), 1);
		delete entity[cName];
		delete entity._components[Component.name];
		return this;
	}
	queryComponents(Components) {
		if(!Array.isArray(Components)) Components = [Components];
		Components = Components.map(C => this.resolveComponent(C));
		//console.info('EntityManager.queryComponents(Components);', Components);
		const res = this._entities.filter(entity => entity.hasAllComponents(Components));
		return res;
	}
	findComponent(Component) {
		//console.info('EntityManager.findComponent("%s");', Component.name || Component);
		const entity = this.queryComponents(Component)[0];
		if(entity === undefined) return undefined;
		const component = entity.getComponent(Component);
		return component;
	}
	queryTags(tags) {
		if(!Array.isArray(tags)) tags = [tags];
		return this._entities.filter(entity => entity.hasAllTags(tags));
	}
	createSystem(System) {
		const systemName = System.getPropertyName();
		if(this[systemName] !== undefined) throw new Error('System name conflict for: '+systemName);
		const system = new System();
		this[System.getPropertyName()] = system;
		system.setManager(this);
		return system;
	}
}
EntityManager.EVENT_ADDCOMPONENT = 'addcomponent';
EntityManager.EVENT_REMOVECOMPONENT = 'removecomponent';
EntityManager.EVENT_DESTROYENTITY = 'destroy';

const createComponent = (name, Class, methods = {}) => {
	console.info('createComponent("%s", Class, methods);', name);
	let constructorFunctionBody = `return function ${name}(){}`;
	console.log('methods:', Object.keys(methods));
	console.log('has constructor:', methods.hasOwnProperty('constructor'));
	if(methods.hasOwnProperty('constructor') && typeof methods.constructor === 'function') {
		constructorFunctionBody = methods.constructor
			.toString()
			.replace(
				/^\w*function[^(]*\(/i,
				`return function ${name}(`
			);
	}
	const Component = new Function(constructorFunctionBody)();
	const prototype = Object.assign(
		Object.create(Class.prototype),
		{OnAttachComponent: function(entity) { Class.call(this); }},
		methods,
		{constructor: Component}
	);
	Component.prototype = prototype;
	return Component;
};

const makeComponent = (Class) => {
	const Component = new Function(`return function ${Class.name}() {}`)();
	Component.prototype = Object.create(Class.prototype, {
		constructor: {
			value: Component,
			configurable: true, enumerable: true, writable: true
		},
		OnAttachComponent: {
			value: function(entity) { Class.call(this); },
			configurable: true, enumerable: true, writable: true
		},
		toJSON: {
			value: componentToJSON,
			configurable: true, enumerable: true, writable: true
		}
	});
	return Component;
};

const showSceneGraph = ({entity, children}, indent = '') => {
	const graphChildren = children
		.filter(({entity}) => entity !== undefined)
		.filter(({entity: {id}}) => id !== entity.id);
	return `E[${entity.id}]: ${Object.keys(entity._components).join(',')}${
		(graphChildren.length === 0)
			?''
			:`\n${
				graphChildren
				.map(child => `${indent} > ${showSceneGraph(child, `${indent}   `)}`)
				.join('\n')}`
		}`;
};


if(typeof module !== 'undefined' && ('exports' in module)){
	const XenoECS = {
		getComponentName,
		Entity,
		System,
		EntityManager,
		createComponent,
		makeComponent,
		showSceneGraph,
	};
	module.exports = XenoECS;
	module.exports.XenoECS = XenoECS;
}
})();