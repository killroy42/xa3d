(() => {
//const THREE = require('THREE');
const {colors} = require('assetdata');
const {makeComponent} = require('XenoECS');
const TweenMax = require('TweenMax');
const TweenLite = require('TweenLite');
const {Sine, SlowMo, Power0, Power4, Back} = TweenLite;


const identityFunction = _=>_;

class EntityStore {
	constructor() {
		this.storeKey = 'saved_entities';
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
		Button,
		ContextMenu, ContextMenuButton,
	};
	module.exports.ecsEditor = module.exports;
}
})();