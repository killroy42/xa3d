(function() {
const THREE = require('THREE');
const assetdata = require('assetdata');
const {colors, dimensions} = assetdata;
const {EntityManager, Entity, Node, makeComponent} = require('XenoECS');
const {
	Transform, Collider, MeshComponent,
	Runtime, OrbitCamComponent, Cursor,
	TransformHandle, Text
} = require('ecsTHREE');
const {EntityStore, Button, ContextMenu, ContextMenuButton} = require('ecsEditor');
const {
	getRandomColor, CardData, Card, CardMesh, Animator,
	BallCard, RoundedCornersCard, XACard
} = require('ecsCards');
const Environment = require('Environment');


const createGridCards = (entities) => {
	for(var i = 0; i < 7 * 3; i++) {
		const x = (i % 7 - 3) * dimensions.unitScale.card.width;
		const y = 2;
		const z = Math.floor(i / 7 - 1) * dimensions.unitScale.card.height;
		entities.createEntity({
			Transform: {
				position: {x, y, z}
			},
			CardData: {
				color: getRandomColor(),
				type: Math.floor(Math.random() * 3)
			},
			Card: {},
			Animator: {},
		});
	}
	const {floor} = entities.findComponent(Environment);
	const cards = entities.queryComponents([Card]);
	floor.addEventListener('mousedown', function(event) {
		if(event.button === 2) cards.forEach(({cardData}) => cardData.color = getRandomColor());
	});
	cards.forEach(({collider, xACard, animator}) => {
		collider.addEventListener('mousedown', function(event) {
			const {entity, entity: {transform, collider, cardData, card}} = this;
			//if(event.button === 0) cardData.set({color: getRandomColor()});
			if(event.button === 2) cardData.type = (cardData.type + 1) % 3;
			if(event.button === 0) animator.animate(2);
			//if(event.button === 2) animator.animate(0);
		});
	});
};

class LoadButton extends ContextMenuButton {
	handleMouseUp(event) {
		super.handleMouseUp(event);
		const store = this.entities.findComponent(EntityStore);
		store.load();
	}
}

class SaveButton extends ContextMenuButton {
	handleMouseUp(event) {
		super.handleMouseUp(event);
		const store = this.entities.findComponent(EntityStore);
		store.save();
	}
}

class ClearButton extends ContextMenuButton {
	handleMouseUp(event) {
		super.handleMouseUp(event);
		//clearPersistant(this.entities);
		const store = this.entities.findComponent(EntityStore);
		store.clearEntities();
	}
}

class RemoveButton extends ContextMenuButton {
	handleMouseUp(event) {
		super.handleMouseUp(event);
		const {entities} = this;
		const {currentTarget} = entities.findComponent(ContextMenu);
		currentTarget.entity.destroy();
	}
}

class NewButton extends ContextMenuButton {
	handleMouseUp(event) {
		super.handleMouseUp(event);
		const {entities} = this;
		const {entity: {transform: {position}}} = entities.findComponent(ContextMenu);
		entities.createEntity({
			Transform: {position},
			Text: {value: 'New Button'},
			Button: {width: 3, height: 0.5},
			Editable: {},
		});
	}
}

class NewCardButton extends ContextMenuButton {
	handleMouseUp(event) {
		super.handleMouseUp(event);
		const {entities} = this;
		const {entity: {transform: {position}}} = entities.findComponent(ContextMenu);
		entities.createEntity({
			Transform: {position},
			CardData: {type: 2},
			Card: {},
			//Animator: {},
			Editable: {}
		});
	}
}

class CardTypeButton extends ContextMenuButton {
	handleMouseUp(event) {
		super.handleMouseUp(event);
		const {entities} = this;
		const {currentTarget: {entity: {cardData}}} = entities.findComponent(ContextMenu);
		cardData.type = (cardData.type + 1) % 3;
	}
}


class Editable {
	constructor() {
		this.handleMouseup = this.handleMouseup.bind(this);
	}
	handleMouseup(event) {
		const {entities, entity: {transform}} = this;
		const handle = entities.findComponent(TransformHandle);
		const contextMenu = entities.findComponent(ContextMenu);
		switch(event.button) {
			case 0: // left
				handle.attach(transform);
				contextMenu.hide();
				break;
			case 2: // right
				handle.detach();
				contextMenu.show(event);
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

const init = () => {
	const entities = new EntityManager();
	entities.registerComponents([
		Runtime,
		Transform, Collider,
		Cursor, OrbitCamComponent,
		Environment, 
		CardData, Card,
		BallCard, RoundedCornersCard, XACard,
		Animator, 
		Text, TransformHandle,
		EntityStore,
		Button,
		LoadButton, SaveButton, ClearButton,
		RemoveButton, NewButton, 
		NewCardButton, CardTypeButton,
		Node, ContextMenu
	]);
	entities.createEntity({
		Runtime: {},
		OrbitCamComponent: {position: {x: 0, y: 16, z: 3}, target: {x: 0, y: 0, z: 0.4}},
		Cursor: {},
		Environment: {},
		TransformHandle: {},
		EntityStore: {}
	});
	
	const {contextMenu} = entities.createEntity({ContextMenu: {}});
	contextMenu.menus = {
		default: [
			{LoadButton: {label: 'Load'}},
			{SaveButton: {label: 'Save'}},
			{ClearButton: {label: 'Clear'}},
			{NewButton: {label: 'New Button'}},
			{NewCardButton: {label: 'New Card'}},
		],
		edit: [
			{RemoveButton: {label: 'Remove'}}
		],
		editCard: [
			{RemoveButton: {label: 'Remove'}},
			{CardTypeButton: {label: 'ChangeType'}},
		]
	};
	contextMenu.OnSelectMenu = ({entity}) => {
		if(entity) {
			if(entity.hasAllComponents(['Editable', Card])) return 'editCard';
			if(entity.hasAllComponents(['Editable'])) return 'edit';
		}
		//return 'default';
	};

	const {floor} = entities.findComponent(Environment);
	const handle = entities.findComponent(TransformHandle);
	floor.addEventListener('mousedown', event => {
		setTimeout(_ => handle.detach(), 0);
		switch(event.button) {
			case 0: // left
				contextMenu.hide();
				break;
			case 2: // right
				contextMenu.show(event);
				break;
		}
	});

	const store = entities.findComponent(EntityStore);
	store.OnFilterEntities = _=>_.hasComponent(Editable);
	store.OnBeforeSave = _=> (delete _.components.Editable, _);
	store.OnBeforeLoad = _=> store.clearEntities();
	store.OnAfterLoad = _=> _.addComponent(Editable);
	store.load();

	/*
	entities.createEntity({
		CardData: {type: 2},
		Card: {},
		//Animator: {},
		Editable: {}
	});

	const hotspot = entities.createEntity({
		Transform: {position: {x: 0, y: 0.5, z: 0}},
		Collider: {scale: {x: 2, y: 0.1, z: 3}},
		Text: {
			position: {x: 0, y: 0.11, z: 0},
			scale: {x: 0.2, y: 0.01, z: 0.2},
			value: 'Hello World',
			font: {},
		},
		Editable: {}
	});
	hotspot.collider.addEventListener('mousedown', function(event) {
		const {entity} = this;
		const {text} = entity;
		text.value = 'Click! '+Math.floor(Math.random()*100);
	});
	/*
	getPersistant()
		.forEach(({collider, transform}) =>
			collider.addEventListener('mousedown', event => handle.attach(transform)));
	*/

	entities.findComponent(Runtime).start();
};


document.addEventListener('DOMContentLoaded', init);
	
})();