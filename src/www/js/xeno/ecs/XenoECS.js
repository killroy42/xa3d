(() => {
/* jshint validthis: true */
'use strict';
const EventDispatcher = require('EventDispatcher');

class Entity {
	constructor() {
		EventDispatcher.apply(this);
		this._id = Entity.getId();
		this._Components = [];
		this._tags = [];
		this._manager = undefined;
		Object.defineProperties(this, {
			id: {get: () => this._id},
		});
	}
	getManager() {
		return this._manager;
	}
	addComponent(Component) {
		this._manager.entityAddComponent(this, Component);
		return this;
	}
	removeComponent(Component) {
		this._manager.entityRemoveComponent(this, Component);
		return this;
	}
	removeAllComponents() {
		const {_Components} = this;
		while(_Components.length > 0) this.removeComponent(_Components[_Components.length - 1]);
		return this;
	}
	getComponent(Component) {
		if(typeof Component === 'string') Component = this._Components.find(({name}) => Component === name);
		if(!this.hasComponent(Component)) throw new Error('Entity does not have component:', Component);
		return this[Component.getPropertyName()];
	}
	hasComponent(Component) {
		if(typeof Component === 'string') Component = this._Components.find(({name}) => Component === name);
		return this._Components.indexOf(Component) !== -1;
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
		this._manager.removeEntity(this);
	}
	update(...args) {
		//console.trace('Entity.update(%s);', JSON.stringify(...args));
		this._Components.forEach((Component) => {
			const c = this.getComponent(Component);
			if(c.OnUpdate) c.OnUpdate(...args);
		});
	}
}
var __nextEntityId = 0;
Object.defineProperties(Entity, {
	getId: {value: () => __nextEntityId++}
});

class Component {
	constructor() {
		this._entity = null;
		this._registeredListeners = [];
	}
	_OnAttachComponent(entity) {
	}
	_OnDetachComponent(entity) {
	}
	getEntity() {
		return this._entity;
	}
	getManager() {
		return this.getEntity()._manager;
	}
	getComponent(Component) {
		return this.getEntity().getComponent(Component);
	}
	registerEventListener(target, eventName, handler) {
		this._registeredListeners.push({target, eventName, handler});
	}
}
Component.getPropertyName = function getPropertyName() {
	const {name} = this;
	return name.charAt(0).toLowerCase() + name.slice(1);
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
	const {name} = this;
	return name.charAt(0).toLowerCase() + name.slice(1);
};

class EntityManager {
	constructor() {
		EventDispatcher.apply(this);
		this._entities = [];
	}
	createEntity(components = []) {
		const {_entities} = this;
		const entity = new Entity();
		entity._manager = this;
		_entities.push(entity);
		components.forEach(Component => entity.addComponent(Component));
		return entity;
	}
	removeEntity(entity) {
		const {_entities} = this;
		entity.removeAllComponents();
		_entities.splice(_entities.indexOf(entity), 1);
		entity._manager = null;
		return this;
	}
	entityAddComponent(entity, Component) {
		if(entity.hasComponent(Component)) return this;
		entity._Components.push(Component);
		//console.trace(Component);
		const cName = Component.getPropertyName();
		const component = new Component();
		entity[cName] = component;
		component._entity = entity;
		component._OnAttachComponent(entity);
		if(component.OnAttachComponent) component.OnAttachComponent(entity);
		this.dispatchEvent({type: EntityManager.EVENT_ADDCOMPONENT, entity, Component});
		return this;
	}
	entityRemoveComponent(entity, Component) {
		if(!entity.hasComponent(Component)) return this;
		const cName = Component.getPropertyName();
		const component = entity[cName];
		this.dispatchEvent({type: EntityManager.EVENT_REMOVECOMPONENT, entity, Component});
		component._OnDetachComponent(entity);
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

if(typeof module !== 'undefined' && ('exports' in module)){
	const XenoECS = {
		Entity,
		Component,
		System,
		EntityManager,
	};
	module.exports = XenoECS;
	module.exports.XenoECS = XenoECS;
}
})();