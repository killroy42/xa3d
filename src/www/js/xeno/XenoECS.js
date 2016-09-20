(() => {
/* jshint validthis: true */
'use strict';

// Entity
	class Entity {
		constructor() {
			this._id = Entity.nextId++;
			this._Components = [];
			this._tags = [];
			this._manager = undefined;
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
			while(_Components.length > 0) this.removeComponent(_Components[0]);
			return this;
		}
		hasComponent(Component) {
			return this._Components.indexOf(Component) !== -1;
		}
		hasAllComponents(Components) {
			for(var i = 0; i < Components.length; i++) {
				if(!this.hasComponent(Components[i])) return false;
			}
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
			return this;
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
		__add(component) {
			const {_components} = this;
			const componentKey = component.getKey();
			if(this[componentKey] !== undefined) throw new Error('Component name collision: '+componentKey);
			_components.push(component);
			component.attach(this);
			this[componentKey] = component;
			return this;
		}
		__remove(component) {
			const {_components} = this;
			delete this[component.getKey()];
			const idx = _components.indexOf(component);
			_components.splice(idx, 1);
			component.detach(this);
			return this;
		}
	}
	Entity.nextId = 0;

// Component
	class Component {
		constructor() {
			this._entity = null;
		}
		getEntity() {
			return this._entity;
		}
	}
	Component.getPropertyName = function getPropertyName() {
		const {name} = this;
		return name.charAt(0).toLowerCase() + name.slice(1);
	};

// System
	class System {
		constructor() {
			this._manager = null;
			this._Components = [];
		}
		setManager(val) { this._manager = val; return this; }
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
			const entity = this._manager.createEntity();
			return this._makerFunc(args, entity);
		}
		remove(entity) {
			this._manager.removeEntity(entity);
		}
	}

// EntityManager
	class EntityManager {
		constructor() {
			this._entities = [];
		}
		createEntity() {
			const {_entities} = this;
			const entity = new Entity();
			entity._manager = this;
			_entities.push(entity);
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
			const cName = Component.getPropertyName();
			const component = new Component();
			entity[cName] = component;
			component._entity = entity;
			if(component.OnAttachComponent) component.OnAttachComponent(entity);
			return this;
		}
		entityRemoveComponent(entity, Component) {
			if(!entity.hasComponent(Component)) return this;
			const cName = Component.getPropertyName();
			const component = entity[cName];
			if(component.OnDetachComponent) component.OnDetachComponent(entity);
			entity._Components.splice(entity._Components.indexOf(Component), 1);
			delete entity[cName];
			return this;
		}
		queryComponents(Components) {
			if(!Array.isArray(Components)) Components = [Components];
			const res = this._entities.filter(entity => entity.hasAllComponents(Components));
			return res;
		}
		queryTags(tags) {
			if(!Array.isArray(tags)) tags = [tags];
			return this._entities.filter(entity => entity.hasAllTags(tags));
		}
	}

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