(() => {
const THREE = require('THREE');
const {makeComponent} = require('XenoECS');
const {dimensions} = require('assetdata');
const {
	Vector3, Euler,
	LineBasicMaterial, Geometry, Line, 
	EllipseCurve,
	//Path,
	//CatmullRomCurve3, EllipseCurve,
} = THREE;

const cardDims = dimensions.unitScale.card;

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


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		CardZone
	};
	module.exports.ecsZones = module.exports;
}
})();