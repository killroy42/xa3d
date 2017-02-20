(() => {
/* jshint validthis: true */
'use strict';

const {Entity, Component, System, EntityManager} = require('XenoECS');


class Selectable extends Component {
	constructor() {
		super();
		this.handleMouseDown = this.handleMouseDown.bind(this);
		this._colliderMesh = undefined;
	}
	handleMouseDown(event) {
		//console.info('Selectable.handleMouseDown(event);');
		this._entity.dispatchEvent(Selectable.EVENT_SELECT, {target: this._entity, originalEvent: event});
	}
	OnAttachComponent(entity) {
		this._colliderMesh = entity.collider.object3d;
		this._colliderMesh.addEventListener('mousedown', this.handleMouseDown);
	}
	OnDetachComponent(entity) {
		this._colliderMesh.removeEventListener('mousedown', this.handleMouseDown);
		this._colliderMesh = undefined;
	}
}
Selectable.EVENT_SELECT = 'select';

class Selected extends System {
	constructor() {
		super();
		this.handleAddComponent = this.handleAddComponent.bind(this);
		this.handleRemoveComponent = this.handleRemoveComponent.bind(this);
		this.handleSelect = this.handleSelect.bind(this);
		this._selected = undefined;
	}
	handleAddComponent(event) {
		const {Component, entity} = event;
		if(Component === Selectable) {
			event.entity.addEventListener(Selectable.EVENT_SELECT, this.handleSelect);
		}
	}
	handleRemoveComponent(event) {
		const {Component, entity} = event;
		if(Component === Selectable) {
			event.entity.removeEventListener(Selectable.EVENT_SELECT, this.handleSelect);
		}
	}
	handleSelect(event) {
		const {target} = event;
		this.select(target);
	}
	select(target) {
		console.info('Selected.select(target);');
		if(target !== this._selected) {
			if(this._selected !== undefined) this.dispatchEvent(Selected.EVENT_DESELECT, {target: this._selected});
			this._selected = target;
			if(this._selected !== undefined) this.dispatchEvent(Selected.EVENT_SELECT, {target: this._selected});
		}
	}
	setManager(manager) {
		super.setManager(manager);
		manager.addEventListener('addcomponent', this.handleAddComponent);
		manager.addEventListener('removecomponent', this.handleRemoveComponent);
	}
}
Selected.EVENT_DESELECT = 'deselect';
Selected.EVENT_SELECT = 'select';


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Selectable,
		Selected,
	};
	module.exports.ecsSelectable = module.exports;
}
})();