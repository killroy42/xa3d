(() => {
//const THREE = require('THREE');
const {colors} = require('assetdata');
const {Entity, makeComponent} = require('XenoECS');
const TweenMax = require('TweenMax');
const TweenLite = require('TweenLite');
const {Sine, SlowMo, Power0, Power4, Back} = TweenLite;
const {
	Collider, TransformHandle
} = require('ecsTHREE');


const identityFunction = _=>_;

class EntityStore {
	constructor() {
		this.storeKey = 'EntityStore';
		this.OnFilterEntities = entity => !entity.hasComponent(EntityStore);
		this.OnBeforeSave = identityFunction;
		this.OnBeforeLoad = identityFunction;
		this.OnAfterLoad = identityFunction;
	}
	getEntities() {
		return this.entities.all.filter(this.OnFilterEntities);
	}
	clearEntities() {
		this.getEntities().forEach(entity => entity.destroy());
	}
	save() {
		const json = {
			entities: this.getEntities()
				.map(e=>e.toJSON())
				.map(this.OnBeforeSave)
		};
		console.log('EntityStore.save():\n', JSON.stringify(json));
		localStorage.setItem(this.storeKey, JSON.stringify(json));
	}
	load(state) {
		const {entities} = this;
		if(state === undefined) state = localStorage.getItem(this.storeKey);
		const json = (typeof state === 'string')?JSON.parse(state):state;
		this.OnBeforeLoad();
		json.entities
			.map(entityJson => entities.createEntity(entityJson.components))
			.map(this.OnAfterLoad);
	}
}

class Editable {
	constructor() {
		this.handleMouseup = this.handleMouseup.bind(this);
	}
	handleMouseup(event) {
		const {entities, entity: {transform}} = this;
		const handle = entities.findComponent(TransformHandle);
		//const contextMenu = entities.findComponent(ContextMenu);
		switch(event.button) {
			case 0: // left
				handle.attach(transform);
				//contextMenu.hide();
				break;
			case 2: // right
				handle.detach();
				//contextMenu.show(event);
				break;
		}
	}
	OnAttachComponent(entity) {
		const {entities} = entity;
		const collider = entity.requireComponent(Collider);
		entity.addEventListener('mouseup', this.handleMouseup);
	}
	OnDetachComponent(entity) {
		const {entities, entity: {transform}} = this;
		const handle = entities.findComponent(TransformHandle);
		handle.detach(transform);
	}
}

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
		//console.info('Node.attach(childNode);', this.entity.id);
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
		if(childNode.entity.transform) {
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
	fromJSON(json = {}) {
		//console.info('Node.fromJSON(json);', this.entity.id);
		const {entities, _children} = this;
		const {children = []} = json;
		[..._children].forEach(({entity}) => entity.destroy());
		children.forEach(json => {
			const child = entities.createEntity(json);
			child.addComponent(Node);
			this.attach(child.node);
		});
	}
	toJSON() {
		const {_children} = this;
		const json = {};
		//if(this._parent) json.parent = this._parent.entity.id;
		if(_children.length > 0) json.children = _children.map(({entity}) => {
			const json = entity.toJSON().components;
			console.log(json);
			delete json.node;
			return json;
		});
		return json;
	}
}

class Button {
	constructor() {
		this.width = 3;
		this.height = 0.5;
		this.handleMouseEnter = this.handleMouseEnter.bind(this);
		this.handleMouseLeave = this.handleMouseLeave.bind(this);
		this.handleMouseDown = this.handleMouseDown.bind(this);
		this.handleMouseUp = this.handleMouseUp.bind(this);
	}
	OnAttachComponent(entity) {
		const collider = entity.requireComponent('Collider');
		const text = entity.requireComponent('Text');
		this.fromJSON();
		collider.addEventListener('mouseenter', this.handleMouseEnter);
		collider.addEventListener('mouseleave', this.handleMouseLeave);
		collider.addEventListener('mousedown', this.handleMouseDown);
		collider.addEventListener('mouseup', this.handleMouseUp);
	}
	OnDestroy() {
		const {entity} = this;
		const collider = entity.getComponent('Collider');
		collider.removeEventListener('mouseenter', this.handleMouseEnter);
		collider.removeEventListener('mouseleave', this.handleMouseLeave);
		collider.removeEventListener('mousedown', this.handleMouseDown);
		collider.removeEventListener('mouseup', this.handleMouseUp);
	}
	handleMouseEnter(event) {
		this.entity.text.material.color.set(colors.Lime[500]);
		this.entity.text.position.y = 0.2;
	}
	handleMouseLeave(event) {
		this.entity.text.material.color.set(0xffffff);
		this.entity.text.position.y = 0.1;
	}
	handleMouseDown(event) {
		this.entity.text.position.y = 0.1;
	}
	handleMouseUp(event) {
		this.entity.text.position.y = 0.2;
		TweenMax.fromTo(this.entity.transform.rotation, 1, {x:0}, {x: 2 * Math.PI, ease: Back.easeInOut});
	}
	fromJSON(json = {}) {
		//console.info('Button.fromJSON(json);', json);
		const {entity} = this;
		const collider = entity.requireComponent('Collider');
		const text = entity.requireComponent('Text');
		this.width = json.width || this.width;
		this.height = json.height || this.height;
		collider.fromJSON({scale: {x: this.width, y: 0.1, z: this.height}});
		text.fromJSON({
			position: {x: 0, y: 0.11, z: 0.1},
			scale: {x: 0.2, y: 0.01, z: 0.2},
			value: json.label || text.value,
		});
	}
	toJSON() {
		const {entity} = this;
		const collider = entity.getComponent('Collider');
		const text = entity.getComponent('Text');
		return {
			label: text.value
		};
	}
}

class ContextMenu {
	constructor() {
		this.menus = {};
		this.currentMenu = undefined;
		this.currentTarget = undefined;
	}
	OnAttachComponent(entity) {
		this.entity.requireComponent('Transform');
		this.entity.requireComponent('Node');
		this.hide();
	}
	OnSelectMenu(target) {
		console.info('ContextMenu.OnSelectMenu(target);');
		return 'default';
	}
	show(event) {
		const {entities, entity: {transform}} = this;
		const scene = entities.findComponent('Scene');
		this.currentTarget = event.target;
		var nextMenu = this.OnSelectMenu(event.target);
		if(this.menus[nextMenu] === undefined) {
			nextMenu = 'default';
		}
		if(nextMenu !== this.currentMenu) {
			this.entity.node.fromJSON({children: this.menus[nextMenu]});
			this.entity.node.children
				.forEach(({entity: {transform: {position}}}, idx) => position.set(1.6, 0, 0.6 + idx * 0.7));
			this.currentMenu = nextMenu;
		}
		transform.position.copy(event.intersection.point);
		transform.position.y = 0.2;
		scene.add(transform);
	}
	hide() {
		const {entity: {transform}} = this;
		if(transform.parent) transform.parent.remove(transform);
	}
}

class ContextMenuButton extends Button {
	handleMouseUp(event) {
		super.handleMouseUp(event);
		const contextMenu = this.entities.findComponent(ContextMenu);
		contextMenu.hide();
	}
}


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		EntityStore,
		Editable,
		Node, Button,
		ContextMenu, ContextMenuButton,
	};
	module.exports.ecsEditor = module.exports;
}
})();