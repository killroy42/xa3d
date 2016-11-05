(() => {
/* jshint validthis: true */
'use strict';
const EventDispatcher = require('EventDispatcher');

const getComponentPropertyName = ({name}) => name.charAt(0).toLowerCase() + name.slice(1);

class Entity {
	constructor(entities, id) {
		EventDispatcher.apply(this);
		Object.defineProperties(this, {
			id: {value: id, writable: false, enumerable: true},
			_manager: {value: entities, writable: false, enumerable: true},
			entities: {value: entities, writable: false, enumerable: true},
			_Components: {value: [], writable: false, enumerable: true},
			_tags: {value: [], writable: false, enumerable: true},
		});
	}
	getManager() {
		return this.entities;
	}
	addComponent(Component) {
		this.entities.entityAddComponent(this, Component);
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
	parseComponent(Component) {
		if(typeof Component === 'string') Component = this._Components.find(({name}) => Component === name);
		return Component;
	}
	getComponent(Component) {
		Component = this.parseComponent(Component);
		if(!this.hasComponent(Component)) throw new Error('Entity does not have component:', Component);
		return this[getComponentPropertyName(Component)];
	}
	hasComponent(Component) {
		Component = this.parseComponent(Component);
		return this._Components.indexOf(Component) !== -1;
	}
	requireComponent(Component) {
		if(!this.hasComponent(Component)) this.addComponent(Component);
		return this.getComponent(Component);
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
	toString() {
		const {id, _Components} = this;
		return `Entity(${id})[${
			_Components
				.map(C => this.getComponent(C))
				.join(', ')
		}]`;
	}
}

class __Component {
	constructor() {
		this._entity = null;
		this._registeredListeners = [];
		Object.defineProperties(this, {
			entities: {get: () => this.entity.entities},
			entity: {get: () => this._entity}
		});
	}
	getEntity() {
		return this._entity;
	}
	getManager() {
		return this.getEntity().entities;
	}
	getComponent(Component) {
		return this.getEntity().getComponent(Component);
	}
	registerEventListener(target, eventName, handler) {
		this._registeredListeners.push({target, eventName, handler});
	}
}
__Component.getPropertyName = function getPropertyName() {
	return getComponentPropertyName(this);
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
		this._components = {};
		this.__nextEntityId = 0;
		Object.defineProperties(this, {
			all: {value: this._entities, writable: false, enumerable: true},
		});
	}
	getNextEntityId() {
		return this.__nextEntityId++;
	}
	registerComponent(component) {
		if(Array.isArray(component)) return this.registerComponents(component);
		if(this._components[component.name] !== undefined) {
			console.warn('Component "%s" already registered', component.name);
		}
		this._components[component.name] = component;
		return this;
	}
	registerComponents(components) {
		components.forEach((component) => this.registerComponent(component));
		return this;
	}
	createEntity(Components = []) {
		const {_entities} = this;
		const entity = new Entity(this, this.getNextEntityId());
		_entities.push(entity);
		this.entityAddComponents(entity, Components);
		return entity;
	}
	removeEntity(entity) {
		const {_entities} = this;
		entity.removeAllComponents();
		_entities.splice(_entities.indexOf(entity), 1);
		entity.entities = null;
		return this;
	}
	getComponent(Component) {
		//console.info('Component.getComponent(Component);');
		/*
		if(!(Component.prototype instanceof Component)) {
			component = this._components[Component];
		}
		*/
		if(this._components[Component] !== undefined) {
			Component = this._components[Component];
		}
		if(Component === undefined) throw new Error('Invalid component:', Component);
		return Component;
	}
	instantiateComponent(entity, Component) {
		return Object.defineProperties(new Component(), {
			entities: {value: this, writable: false, enumerable: true},
			entity: {value: entity, writable: false, enumerable: true},
			_entity: {value: entity, writable: false, enumerable: true},
			toString: {value: 
				(Component.prototype.toString && Component.prototype.toString !== Object.prototype.toString)
					?Component.prototype.toString
					:() => `${Component.name}`
			},
		});
	}
	entityAddComponent(entity, Component) {
		//console.info('EntityManager.entityAddComponent(entity, Component);');
		Component = this.getComponent(Component);
		if(entity.hasComponent(Component)) return this;
		const cName = getComponentPropertyName(Component);
		const component = this.instantiateComponent(entity, Component);
		entity[cName] = component;
		if(component.OnAttachComponent) component.OnAttachComponent(entity);
		entity._Components.push(Component);
		this.dispatchEvent({type: EntityManager.EVENT_ADDCOMPONENT, entity, Component});
		return this;
	}
	entityAddComponents(entity, Components) {
		Components.forEach(Component => this.entityAddComponent(entity, Component));
		return this;
	}
	entityRemoveComponent(entity, Component) {
		if(!entity.hasComponent(Component)) return this;
		const cName = getComponentPropertyName(Component);
		const component = entity[cName];
		this.dispatchEvent({type: EntityManager.EVENT_REMOVECOMPONENT, entity, Component});
		if(component.OnDetachComponent) component.OnDetachComponent(entity);
		entity._Components.splice(entity._Components.indexOf(Component), 1);
		delete entity[cName];
		return this;
	}
	queryComponents(Components) {
		if(!Array.isArray(Components)) Components = [Components];
		//console.info('EntityManager.queryComponents(Components);', Components);
		const res = this._entities.filter(entity => entity.hasAllComponents(Components));
		return res;
	}
	findComponent(Component) {
		//console.info('EntityManager.findComponent("%s");', Component.name || Component);
		const entity = this.queryComponents(Component)[0];
		if(entity === undefined) return undefined;
		return entity.getComponent(Component);
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

const createComponent = (name, Class, prototype = {}) => {
	var constructorFunctionBody = `return function ${name}(){}`;
	if(prototype.hasOwnProperty('constructor')
			&& typeof prototype.constructor === 'function') {
		constructorFunctionBody = prototype.constructor
			.toString()
			.replace(
				/^\w*function[^(]*\(/i,
				`return function ${name}(`
			);
	}
	const constructor = new Function(constructorFunctionBody)();
	constructor.prototype = Object.assign(Object.create(Class.prototype),
		{OnAttachComponent: function(entity) { Class.call(this); }},
		prototype,
		{constructor}
	);
	return constructor;
};

if(typeof module !== 'undefined' && ('exports' in module)){
	const XenoECS = {
		Entity,
		System,
		EntityManager,
		createComponent,
	};
	module.exports = XenoECS;
	module.exports.XenoECS = XenoECS;
}
})();