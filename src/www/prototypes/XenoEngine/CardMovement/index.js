(function() {
const THREE = require('THREE');
const assetdata = require('assetdata');
const {colors, dimensions} = assetdata;
const {EntityManager, Entity, makeComponent} = require('XenoECS');
const {
	Transform, Collider, MeshComponent,
	Runtime, OrbitCamComponent, Cursor,
	TransformHandle, Text
} = require('ecsTHREE');
const {
	EntityStore,
	Node, Button,
	ContextMenu, ContextMenuButton
} = require('ecsEditor');
const {
	getRandomColor, CardData, Card, CardMesh, Animator,
	BallCard, RoundedCornersCard, XACard
} = require('ecsCards');
const Environment = require('Environment');


const cardDims = dimensions.unitScale.card;

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

const {
	Vector3, Euler,
	Line, Geometry, LineBasicMaterial,
	Path,
	CatmullRomCurve3, EllipseCurve,
} = THREE;
const TweenMax = require('TweenMax');
const TweenLite = require('TweenLite');
const {Sine, SlowMo, Power0, Power2} = TweenLite;
class CardAnimator {
	OnAttachComponent(entity) {
		//console.info('Animator.OnAttachComponent(entity);');
		this.directions = [
			new Vector3(0, 0, -1), // up
			new Vector3(1, 0, 0), // right
			new Vector3(0, 0, 1), // down
			new Vector3(-1, 0, 0), // left
		];
	}
	getTranslation(animation) {
		//const cardMesh = this.entity.getComponent(CardMesh);
		const {entity, entities, directions} = this;
		const transform = entity.getComponent(Transform);
		const cardMesh = entity.getComponent(CardMesh);
		const cardSize = new Vector3(cardMesh.width, 0, cardMesh.height);
		const cards = entities.queryComponents([Card]);
		const translation = new Vector3();
		switch(animation) {
			case 0: translation.set(2, 0, 0); break;
			case 1: translation.set(-2, 0, 0); break;
			case 2:
				var dirs = directions.filter(dir =>
					cards.find(({transform: {position}}) =>
						transform.position.clone()
							.add(dir.clone().multiply(cardSize))
							.distanceTo(position) < 1
					) === undefined
				);
				if(dirs.length > 0) {
					var dir = Math.floor(Math.random()*dirs.length);
					translation.copy(dirs[dir]);
				}
				break;
		}
		return {translation};
	}
	getRotation({translation}) {
		const transform = this.entity.getComponent(Transform);
		const start = transform.rotation.clone();
		start.x = Math.abs(start.x) % (2 * Math.PI);
		start.y = Math.abs(start.y) % (2 * Math.PI);
		start.z = Math.abs(start.z) % (2 * Math.PI);
		const end = start.clone();
		const horizontal = Math.abs(translation.x) > Math.abs(translation.z);
		if(horizontal) {
			const landRightSideUp = Math.abs(start.x) % (2 * Math.PI) <= Number.EPSILON;
			const moveLeft = translation.x <= Number.EPSILON;
			const flipLeft = moveLeft == landRightSideUp;
			end.z += (flipLeft?1:-1) * Math.PI;
		} else {
			const flipUp = translation.z <= Number.EPSILON;
			end.x += (flipUp?-1:1) * Math.PI;
		}
		return {start, end};
	}
	getCurve(from, to, height = 1) {
		const points = [
			from,
			from.clone().add(new Vector3(0, height, 0))
				.addScaledVector(to.clone().sub(from), 0.25),
			to.clone().add(new Vector3(0, height, 0))
				.addScaledVector(to.clone().sub(from), -0.25),
			to
		];
		const curve = new CatmullRomCurve3(points);
		return curve;
	}
	getCurveLine(curve) {
		const material = new LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.2});
		const geometry = new Geometry();
		geometry.vertices = curve.getSpacedPoints(20);
		const line = new Line(geometry, material);
		return line;
	}
	animate(target, onComplete) {
		//console.info('Animator.animate(animation);');
		const transform = this.entity.getComponent(Transform);
		const cardMesh = this.entity.getComponent(CardMesh);
		const props = {t: 0};
		/*
		const {translation} = this.getTranslation(animation);
		const {start, end} =  this.getRotation({translation});
		const horizontal = Math.abs(translation.x) > Math.abs(translation.z);
		const curveHeight = (horizontal?cardMesh.width:cardMesh.height) * 0.5;
		const rot = new Vector3();
		translation.multiplyScalar(curveHeight * 2);
		*/
		const curveHeight = 2;
		const curve = this.getCurve(
			transform.position.clone(),
			target.clone(),
			curveHeight
		);
		const startY = transform.position.y;
		const line = this.getCurveLine(curve);
		transform.parent.add(line);
		const speed = 30;
		const duration = curve.getLength() / speed;
		//console.log('length:', curve.getLength());
		//console.log('duration:', duration);
		return TweenMax.to(props, duration, {
			t: 1,
			ease: SlowMo.ease.config(0.1, 0.4, false),
			onUpdate: () => {
				transform.position.copy(curve.getPointAt(props.t));
				//rot.lerpVectors(start, end, props.t);
				//transform.rotation.z = rot.z;
				//transform.rotation.x = rot.x;
				line.material.opacity = 0.2 + (transform.position.y - startY) / curveHeight * 0.5;
			},
			onComplete: () => {
				TweenMax.to(line.material, 0.5, {
					opacity: 0,
					onComplete: () => {
						line.parent.remove(line);
					}
				});
				if(typeof onComplete === 'function') onComplete(this);
			}
		});
	}
	slideTo(targetPos, targetRot, onComplete) {
		//console.info('CardAnimator.slideTo(targetPos, targetRot, onComplete);');
		const transform = this.entity.getComponent(Transform);
		const props = {t: 0};
		const startPos = transform.position.clone();
		const startRot = transform.rotation.clone();
		const pos = new Vector3();
		const rot = new Euler();
		return TweenMax.to(props, 0.2, {
			t: 1,
			ease: Power2.easeInOut,
			onUpdate: () => {
				pos.lerpVectors(startPos, targetPos, props.t);
				transform.position.copy(pos);
				transform.rotation.x = (targetRot.x - startRot.x) * props.t + startRot.x;
				transform.rotation.y = (targetRot.y - startRot.y) * props.t + startRot.y;
				transform.rotation.z = (targetRot.z - startRot.z) * props.t + startRot.z;
			},
			onComplete
		});
	}
}

const createFanSlots = (max) => {
	const PI2 = 2 * Math.PI;
	const divisions = max-1;
	const curve = new EllipseCurve(0, 0, 1, 1, 0.75 * Math.PI,	0.25 * Math.PI, true, Math.PI);
	const right = new Vector3(1, 0, 0);
	const f = 1 - Math.sin(0.25 * Math.PI);
	return (idx, total) => {
		let point = curve.getPointAt(idx / divisions);
		let tan2 = curve.getTangentAt(idx / divisions);
		let tan = new Vector3(tan2.x, 0, tan2.y);
		let ang = (tan.angleTo(right) * ((tan.z <= 0)?1:-1) + PI2) % PI2 - Math.PI;
		let position = new Vector3(
			(point.x) * (1 / (1 - f)) * 0.5,
			0,
			(point.y + 1 - 0.5 * f) * (1 / f)
		);
		let rotation = new Euler(0, ang, -0.025 * Math.PI);
		return {position, rotation};
	};
};

const createGridSlots = (max) => {
	const divisions = max-1;
	return (idx, total) => {
		let position = new Vector3(0.5 * ((total - 1) / divisions) - (idx / divisions), 0, 0);
		let rotation = new Euler();
		return {position, rotation};
	};
};

class CardZone {
	constructor() {
		this._cards = [];
		this._slotPadding = 0.2;
		this._slotWidth = cardDims.width + this._slotPadding;
		this._slotHeight = cardDims.height + this._slotPadding;
		this.handleCardMouseup = this.handleCardMouseup.bind(this);
		this._layout = 'grid';
		this._slotCount = 3;
		Object.defineProperties(this, {
			slotCount: {
				get: _=>this._slotCount,
				set: newSlotCount => {
					this.setSlots(this._layout, newSlotCount);
				}
			},
			layout: {
				get: _=>this._layout,
				set: newLayout => {
					this.setSlots(newLayout, this._slotCount);
				}
			},
		});
	}
	OnAttachComponent(entity) {
		//console.info('CardZone.OnAttachComponent(entity);');
		const {entities} = this;
		const transform = entity.requireComponent('Transform');
		const collider = entity.requireComponent('Collider');
		const node = entity.requireComponent('Node');
		collider.addEventListener('mouseup', (event) => {
			const card = entities.createEntity({
				CardData: {type: 1},
				Card: {},
				CardAnimator: {}
			});
			this.attachCard(card);
			this.insertCard(card);
		});
		this.setSlots(this.layout, this.slotCount);
	}
	handleCardMouseup(event) {
		//console.info('CardZone.handleCardMouseup(event);');
		this.removeCard(event.target.entity);
	}
	attachCard(card) {
		//console.info('CardZone.attachCard(card);');
		const {entity: {node}} = this;
		node.attach(card);
		card.collider.addEventListener('mouseup', this.handleCardMouseup);
	}
	detachCard(card) {
		//console.info('CardZone.attachCard(card);');
		const {entity: {node}} = this;
		node.detach(card);
		card.collider.removeEventListener('mouseup', this.handleCardMouseup);
	}
	insertCard(card, slot) {
		//console.info('CardZone.insertCard(card, slot);');
		const {entity: {node}, _cards} = this;
		if(card !== null) node.attach(card);
		_cards.splice(slot, 0, card);
		//this.slots.set(this.slots.layout, _cards.length);
		//this.updateSlots();
		this.arrangeCards();
	}
	removeCard(card) {
		//console.info('CardZone.removeCard(card);');
		const {entity: {node}, _cards} = this;
		const slotIdx = _cards.findIndex(entity => entity === card);
		if(slotIdx !== -1) {
			this.detachCard(card);
			_cards.splice(slotIdx, 1);
			this.arrangeCards();
		}
	}
	setSlots(layout, slotCount) {
		//console.info('CardZone.setSlots(layout, slotCount);');
		const {
			entity: {transform, collider: {scale}},
			slots, _slotWidth, _slotHeight
		} = this;
		this._layout = layout;
		this._slotCount = slotCount;
		this.slotOffset = new Vector3(0, 0.1, 0);
		this.slotScale = new Vector3(scale.x - _slotWidth, 1, scale.z - _slotHeight);
		switch(layout) {
			case 'grid': this._slotFunc = createGridSlots(slotCount); break;
			case 'fan': this._slotFunc = createFanSlots(slotCount); break;
		}
		this.arrangeCards();
		this.drawLayoutLine();
	}
	getSlot(idx, total = this._slotCount) {
		const slot = this._slotFunc(idx, total);
		slot.position.add(this.slotOffset).multiply(this.slotScale);
		return slot;
	}
	arrangeCards() {
		//console.info('CardZone.arrangeCards();');
		const {_cards, slots} = this;
		_cards.forEach((card, idx) => {
			if(card) {
				const slot = this.getSlot(idx, _cards.length);
				card.cardAnimator.slideTo(slot.position, slot.rotation);
			}
		});
	}
	drawLayoutLine() {
		const {entity: {transform}, _slotCount}= this;
		transform.children
			.filter(child => child instanceof Line)
			.forEach(line => transform.remove(line));
		const material = new LineBasicMaterial({color: 0xff0000});
		const geometry = new Geometry();
		for(var i = 0; i < _slotCount; i++) geometry.vertices.push(this.getSlot(i).position);
		const line = new Line(geometry, material);
		transform.add(line);
		line.position.y = 0.5;
	}
	fromJSON(json = {}) {
		//console.info('CardZone.fromJSON(json);');
		const {slots, layout, slotCount} = this;
		this.setSlots(json.layout || layout, json.slotCount || slotCount);
		return this;
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
		Animator, CardAnimator,
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
			{Transform: {position: {x: 0, y: 0, z: 0}}, Button: {label: 'Create Place'}},
			{Transform: {position: {x: 0, y: 0, z: 0.7}}, Button: {label: 'Play Card'}},
			{Transform: {position: {x: 0, y: 0, z: 1.4}}, Button: {label: 'Test A'}},
		]}
	});

	const findEntity = (selector) => entities.queryComponents([Button]).filter(selector)[0];

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
			Animator2: {},
		});
		card.animator2.animate(targetPos, (animator) => {
			const setAlpha = getGlobalAlphaSetter(animator.entity.transform);
			const alpha = {opacity: 1};
			TweenMax.to(alpha, 1, {
				opacity: 0,
				onUpdate: () => setAlpha(alpha.opacity),
				onComplete: () => animator.entity.destroy()
			});
		});
	};

	findEntity(({text: {value}}) => value === 'Create Place')
		.collider.addEventListener('mouseup', prepareCreatePlace);
	findEntity(({text: {value}}) => value === 'Play Card')
		.collider.addEventListener('mouseup', playCard);
	findEntity(({text: {value}}) => value === 'Test A')
		.collider.addEventListener('mouseup', event => {
			zones.forEach(({cardZone}) => cardZone.layout = (cardZone.layout === 'grid')?'fan':'grid');
		});

	const oppBoard = entities.createEntity({
		Transform: {position: {x: 0, y: 0, z: -1.4}, rotation: {x: 0, y: 1 * Math.PI, z: 0}},
		Collider: {scale: {x: 12.8, y: 0.1, z: 2.6}},
		Text: {
			position: {x: 0, y: 0.11, z: 0},
			scale: {x: 0.2, y: 0.01, z: 0.2},
			value: 'Opponent Board',
		},
		CardZone: {layout: 'grid', slotCount: 7},
		Editable: {},
	});
	const oppHand = entities.createEntity({
		Transform: {position: {x: 0, y: 0, z: -5}, rotation: {x: 0, y: 1 * Math.PI, z: 0}},
		Collider: {scale: {x: 8, y: 0.1, z: 3}},
		Text: {
			position: {x: 0, y: 0.11, z: 0},
			scale: {x: 0.2, y: 0.01, z: 0.2},
			value: 'Opponent Hand',
		},
		CardZone: {layout: 'fan', slotCount: 10},
		Editable: {},
	});
	const ownBoard = entities.createEntity({
		Transform: {position: {x: 0, y: 0, z: 1.4}},
		Collider: {scale: {x: 12.8, y: 0.1, z: 2.6}},
		Text: {
			position: {x: 0, y: 0.11, z: 0},
			scale: {x: 0.2, y: 0.01, z: 0.2},
			value: 'Own Board',
		},
		CardZone: {layout: 'grid', slotCount: 7},
		Editable: {},
	});
	const ownHand = entities.createEntity({
		//Transform: {position: {x: 0, y: 0, z: 4.8}},
		Transform: {position: {x: 0, y: 0, z: 5}},
		Collider: {scale: {x: 8, y: 0.1, z: 3}},
		Text: {
			position: {x: 0, y: 0.11, z: 0},
			scale: {x: 0.2, y: 0.01, z: 0.2},
			value: 'Own Hand',
		},
		CardZone: {layout: 'fan', slotCount: 10},
		Editable: {},
	});

	const zones = entities.queryComponents([CardZone]);
	for(var i = 0; i < 12;i++) {
		setTimeout(() => {
			const card = entities.createEntity({CardData: {type: 1}, Card: {}, CardAnimator: {}});
			const zone = zones[Math.floor(Math.random() * zones.length)].cardZone;
			zone.attachCard(card);
			zone.insertCard(card);
		}, i * 200);
	}

	/*
	btnPlayCard.collider.addEventListener('mouseup', event => {
		//console.log('CLICK!');
		const card = entities.createEntity({
			Transform: {position: source.transform.position},
			CardData: {type: 1},
			Card: {},
			Animator2: {},
		});
		card.animator2.animate(target.transform.position, (animator) => {
			console.log('completed:', animator);
			//animator.entity.transform.traverse(node => console.log(node));
			animator.entity.destroy();
		});
	});
	*/

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