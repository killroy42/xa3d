(function() {
const THREE = require('THREE');
const assetdata = require('assetdata');
const {colors, dimensions} = assetdata;
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {Vector3} = THREE;
const {
	Transform, Collider, MeshComponent,
	Runtime, OrbitCamComponent, Cursor,
	TransformHandle, Text
} = require('ecsTHREE');
const {
	EntityStore,
	Node, Button, Editable,
	ContextMenu, ContextMenuButton
} = require('ecsEditor');
const {
	getRandomColor, CardData, Card, CardMesh, CardAnimator,
	BallCard, RoundedCornersCard, XACard
} = require('ecsCards');
const {CardZone} = require('ecsZones');
const Environment = require('Environment');

const getGlobalAlphaSetter = object3d => {
	const materials = [];
	object3d.traverse(({material}) => {
		if(material) {
			material.transparent = true;
			materials.push({material, opacity: material.opacity});
		}
	});
	return globalAlpha => materials.forEach(({material, opacity}) => material.opacity = opacity * globalAlpha);
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

const init = () => {
	const entities = new EntityManager();
	entities.registerComponents([
		Runtime,
		Transform, Collider,
		Cursor, OrbitCamComponent,
		Environment, 
		CardData, Card,
		BallCard, RoundedCornersCard, XACard,
		CardAnimator,
		Text, TransformHandle,
		EntityStore,
		Button,
		LoadButton, SaveButton, ClearButton,
		RemoveButton, NewButton, 
		NewCardButton, CardTypeButton,
		Node, ContextMenu, Editable,
		CardZone,
	]);
	entities.createEntity({
		Runtime: {},
		OrbitCamComponent: {position: {x: 0, y: 10.6, z: 3.7}, target: {x: 0, y: 0, z: 0.7}},
		Cursor: {},
		Environment: {},
		TransformHandle: {},
		EntityStore: {}
	});
	const {floor} = entities.findComponent(Environment);
	const handle = entities.findComponent(TransformHandle);
	
/*
	const {contextMenu} = entities.createEntity({ContextMenu: {}});
	contextMenu.menus = {
		default: [
			{LoadButton: {label: 'Load'}},
			{SaveButton: {label: 'Save'}},
			{ClearButton: {label: 'Clear'}},
			{NewButton: {label: 'New Button'}},
			{NewCardButton: {label: 'New Card'}},
			//{Button: {label: 'New Place'}},
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
*/

	const store = entities.findComponent(EntityStore);
	store.storeKey = 'protoype-CardMovement';
	store.OnFilterEntities = _=>_.hasComponent(Editable);
	store.OnBeforeSave = _=> (delete _.components.Editable, _);
	store.OnBeforeLoad = _=> store.clearEntities();
	store.OnAfterLoad = _=> _.addComponent(Editable);
	//store.load();

	const mainMenu = entities.createEntity({
		Transform: {position: {x: -8, y: 0, z: -5}},
		//Collider: {scale: {x: 16, y: 0.1, z: 1}},
		Node: {children: [
			//{Transform: {position: {x: 0, y: 0, z: 0}}, Button: {label: 'Create Place'}},
			//{Transform: {position: {x: 0, y: 0, z: 0.7}}, Button: {label: 'Play Card'}},
			{Transform: {position: {x: 0, y: 0, z: 0}}, Button: {label: 'Reset Camera'}},
			{Transform: {position: {x: 0, y: 0, z: 0.7}}, Button: {label: 'Flip Zone Display'}},
		]}
	});

/*
	var setSource = true;
	var source, target;
	const createPlace = event => {
		floor.removeEventListener('mouseup', createPlace);
		const place = entities.createEntity({
			Transform: {position: event.intersection.point},
			Collider: {scale: {x: 4, y: 0.1, z: 3}},
			Text: {
				position: {x: 0, y: 0.11, z: 0},
				scale: {x: 0.2, y: 0.01, z: 0.2},
				value: 'Place',
			},
			Editable: {}
		});
		place.collider.addEventListener('mouseup', event => {
			if(event.intersection && event.intersection.object.entity) {
				const {entity} = event.intersection.object;
				if(setSource) {
					source = entity;
					setSource = !setSource;
				} else {
					if(source !== entity) {
						target = entity;
						setSource = !setSource;
					}
				}
			}
		});
	};
	const prepareCreatePlace = event => floor.addEventListener('mouseup', createPlace);
	const playCard = event => {
		const sourcePos = source.transform.position.clone().add(new Vector3(0, 0.1, 0));
		const targetPos = target.transform.position.clone().add(new Vector3(0, 0.1, 0));
		const card = entities.createEntity({
			Transform: {position: sourcePos},
			CardData: {type: 1},
			Card: {},
			CardAnimator: {},
		});
		card.animator2.animate(targetPos, (cardAnimator) => {
			const setAlpha = getGlobalAlphaSetter(cardAnimator.entity.transform);
			const alpha = {opacity: 1};
			TweenMax.to(alpha, 1, {
				opacity: 0,
				onUpdate: () => setAlpha(alpha.opacity),
				onComplete: () => cardAnimator.entity.destroy()
			});
		});
	};
	entities.all.find(({button, text}) => button && text.value === 'Create Place')
		.collider.addEventListener('mouseup', prepareCreatePlace);
	entities.all.find(({button, text}) => button && text.value === 'Play Card')
		.collider.addEventListener('mouseup', playCard);
*/
	entities.all.find(({button, text}) => button && text.value === 'Reset Camera')
		.collider.addEventListener('mouseup', event => {
			//zones.forEach(({cardZone}) => cardZone.layout = (cardZone.layout === 'grid')?'fan':'grid');
			const orbitCam = entities.findComponent(OrbitCamComponent);
			orbitCam.slideCamera(new Vector3(0, 10.6, 3.7), new Vector3(0, 0, 0.7));
		});
	entities.all.find(({button, text}) => button && text.value === 'Flip Zone Display')
		.collider.addEventListener('mouseup', event => {
			zones.forEach(({cardZone}) => cardZone.layout = (cardZone.layout === 'grid')?'fan':'grid');
		});

	const zonesJson = [
		{
			Transform: {position: {x: 0, y: 0, z: -1.3}, rotation: {x: 0, y: 1 * Math.PI, z: 0}},
			Collider: {scale: {x: 10.5, y: 0.1, z: 2.0}},
			Text: {value: 'Opponent Board', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
			CardZone: {layout: 'grid', slotCount: 7},
		},
		{
			Transform: {position: {x: 0, y: 0, z: 0.7}},
			Collider: {scale: {x: 10.5, y: 0.1, z: 2.0}},
			Text: {value: 'Own Board', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
			CardZone: {layout: 'grid', slotCount: 7},
		},
		{
			Transform: {position: {x: 0, y: 0, z: -5.2}, rotation: {x: 0, y: 1 * Math.PI, z: 0}},
			Collider: {scale: {x: 8, y: 0.1, z: 2.2}},
			Text: {value: 'Opponent Hand', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
			CardZone: {layout: 'fan', slotCount: 10},
		},
		{
			Transform: {position: {x: 0, y: 0, z: 4.8}},
			Collider: {scale: {x: 8, y: 0.1, z: 2.4}},
			Text: {value: 'Own Hand', position: {x: 0, y: 0.11, z: 0}, scale: {x: 0.2, y: 0.01, z: 0.2}},
			CardZone: {layout: 'fan', slotCount: 10},
		}
	];
	zonesJson.forEach(zoneJson => entities.createEntity(zoneJson).addComponent(Editable));
	const zones = entities.queryComponents([CardZone]);
	for(var i = 0; i < 12;i++) {
		setTimeout(() => {
			const card = entities.createEntity({CardData: {type: 1}, Card: {}, CardAnimator: {}});
			const zone = zones[Math.floor(Math.random() * zones.length)].cardZone;
			zone.attachCard(card);
			zone.insertCard(card);
		}, i * 200);
	}

	entities.findComponent(Runtime).start();
};


document.addEventListener('DOMContentLoaded', init);
	
})();