(() => {
const THREE = require('THREE');
const {makeComponent} = require('XenoECS');
const {DataComponent} = require('ecsCore');
const {
	//Scene, Renderer, Camera, Runtime, MouseEvents, Cursor,
	//Transform, MeshComponent, Collider,
	MeshComponent, Collider, Transform, Renderer,
} = require('ecsTHREE');
const assetdata = require('assetdata');
const XenoCard3D = require('XenoCard3D');
const {makeRoundedRectShape} = require('GeometryHelpers');
const {
	Vector3,
	MeshPhongMaterial,
	Geometry, BoxGeometry, SphereGeometry, ExtrudeGeometry,
	Mesh,
	TextureLoader,
	Line, LineBasicMaterial, CatmullRomCurve3,
} = THREE;

const {colors, dimensions, getRandomPortraitUrl} = assetdata;


const getRandomColor = (color) => {
	if(typeof color === 'number') return color;
	if(typeof color === 'string') return parseInt('0x'+color.replace(/^#/, ''));
	var keys = Object.keys(colors);
	return getRandomColor(colors[keys[Math.floor(Math.random() * keys.length)]]);
};

class CardData extends DataComponent {
	constructor() {
		super();
		this.createProp('id', undefined);
		this.createProp('name', 'Card');
		this.createProp('color', getRandomColor());
		this.createProp('type', -1);
	}
	OnAttachComponent(entity) {
		this.initProp('id', this.entity.id);
		this.name = `Card [${this.id}]`;
	}
}

class Card {
	OnAttachComponent(entity) {
		const meshTypes = [BallCard, RoundedCornersCard, XACard];
		const collider = entity.requireComponent(Collider);
		const cardData = entity.requireComponent(CardData);
		collider.padding.set(0.2, 0.05, 0.2);
		const updateColor = (color) => {
			const cardMesh = entity.getComponent(CardMesh);
			if(cardMesh) {
				if(cardMesh instanceof XACard) {
					const portrait = assetdata.portraitPath + assetdata.portraits[color % assetdata.portraits.length];
					cardMesh.setPortrait(portrait);
				} else {
					cardMesh.material.color.set(color);
				}
			}
		};
		entity.on('datachanged', (change, data) => {
			if(change.color !== undefined && data.color !== change.color) {
				const cardMesh = entity.getComponent(CardMesh);
				if(cardMesh) cardMesh.setColor(change.color);
			}
			if(change.type !== undefined && data.type !== change.type) {
				entity.removeComponent(CardMesh);
				entity.addComponent(meshTypes[change.type]);
				collider.setFromMesh(entity.getComponent(Transform));
				const cardMesh = entity.getComponent(CardMesh);
				if(cardMesh) cardMesh.setColor(data.color);
			}
		});
	}
}

class CardMesh extends MeshComponent {
	constructor() {
		super();
		Object.assign(this, {
			width: dimensions.unitScale.card.width,
			height: dimensions.unitScale.card.height,
			thickness: 0.05
		});
	}
	setColor(color) {
		//console.info('CardMesh.setColor(color);');
		this.material.color.set(color);
	}
}
class RoundedCornersCard extends CardMesh {
	OnAttachComponent(entity) {
		const {width, height, thickness} = this;
		const cornerRadius = 0.2;
		const shape = makeRoundedRectShape(0, 0, width, height, cornerRadius);
		const geometry = new ExtrudeGeometry(shape, {amount: thickness, bevelEnabled: false, steps: 1});
		geometry.rotateX(0.5 * Math.PI);
		geometry.translate(0, thickness, 0);
		const material = new MeshPhongMaterial();
		Mesh.call(this, geometry, material);
		super.OnAttachComponent(entity);
	}
}
class BallCard extends CardMesh {
	OnAttachComponent(entity) {
		const {width, height, thickness} = this;
		const geometry = new SphereGeometry(width / 2, 32, 32);
		geometry.scale(1, width * thickness, height / width * 0.6);
		const material = new MeshPhongMaterial();
		Mesh.call(this, geometry, material);
		super.OnAttachComponent(entity);
	}
}
class XACard extends CardMesh {
	constructor() {
		super();
		this.portrait = null;
	}
	OnAttachComponent(entity) {
		const xenoCard3D = new XenoCard3D();
		const {entities} = entity;
		const transform = entity.requireComponent(Transform);
		const collider = entity.requireComponent(Collider);
		const renderer = entities.findComponent(Renderer);
		const textureLoader = new TextureLoader();
		textureLoader.crossOrigin = 'Anonymous';
		this.loadTexture = (url) => {
			var resolverFunc;
			const texture = textureLoader.load(
				url,
				() => resolverFunc(),
				undefined,
				(err) => this.handleError(err));
			//texture.minFilter = LinearFilter;
			texture.promise = new Promise((resolve, reject) => resolverFunc = resolve);
			texture.anisotropy = renderer.getMaxAnisotropy();
			return texture;
		};
		const card = xenoCard3D.createCard(this.portrait);
		card.scale.set(0.01, 0.01, 0.01);
		card.rotateX(-0.5 * Math.PI);
		const geometry = new BoxGeometry(0.001, 0.001, 0.001);
		const material = new MeshPhongMaterial({color: colors.grey900, transparent: true, opacity: 0});
		Mesh.call(this, geometry, material);
		this.add(card);
		super.OnAttachComponent(entity);
		card.on('meshReady', () => collider.setFromMesh(transform));
	}
	setPortrait(url) {
		//console.info('XACard.setColor("%s");', url);
		const card = this.getObjectByName('card');
		this.portrait = this.loadTexture(url);
		const portraitMesh = this.getObjectByName('card.portrait');
		if(portraitMesh === undefined) {
			card.on('meshReady', () => {
				const portraitMesh = this.getObjectByName('card.portrait');
				portraitMesh.material.map = this.portrait;
			});
		} else {
			portraitMesh.material.map = this.portrait;
		}
	}
	setColor(color) {
		const portrait = assetdata.portraitPath + assetdata.portraits[color % assetdata.portraits.length];
		this.setPortrait(portrait);
	}
}

const TweenMax = require('TweenMax');
const TweenLite = require('TweenLite');
const {Sine, SlowMo, Power0} = TweenLite;
class Animator {
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
	animate(animation) {
		//console.info('Animator.animate(animation);');
		const transform = this.entity.getComponent(Transform);
		const cardMesh = this.entity.getComponent(CardMesh);
		const props = {t: 0};
		const {translation} = this.getTranslation(animation);
		const {start, end} =  this.getRotation({translation});
		const horizontal = Math.abs(translation.x) > Math.abs(translation.z);
		const curveHeight = (horizontal?cardMesh.width:cardMesh.height) * 0.5;
		const startY = transform.position.y;
		const rot = new Vector3();
		translation.multiplyScalar(curveHeight * 2);
		const curve = this.getCurve(
			transform.position.clone(),
			transform.position.clone().add(translation),
			curveHeight
		);
		const line = this.getCurveLine(curve);
		transform.parent.add(line);
		TweenMax.to(props, 0.2, {
			t: 1,
			ease: SlowMo.ease.config(0.0, 0.5, false),
			onUpdate: () => {
				transform.position.copy(curve.getPointAt(props.t));
				rot.lerpVectors(start, end, props.t);
				transform.rotation.z = rot.z;
				transform.rotation.x = rot.x;
				line.material.opacity = 0.2 + (transform.position.y - startY) / curveHeight * 0.5;
			},
			onComplete: () => {
				TweenMax.to(line.material, 0.5, {
					opacity: 0,
					onComplete: () => line.parent.remove(line)
				});
			}
		});
	}
}


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		getRandomColor,
		CardData,
		Card,
		CardMesh,
		RoundedCornersCard,
		BallCard,
		XACard,
		Animator,
	};
	module.exports.ecsCards = module.exports;
}
})();