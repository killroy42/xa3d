(() => {

const {Entity, System, EntityManager, createComponent, makeComponent} = require('XenoECS');
const XenoRuntime = require('XenoRuntime');
const MouseHandler = require('MouseHandler');
const MouseCursor = require('MouseCursor');
const THREE = require('THREE');
const {
	Vector3, Matrix4, Box3, Object3D,
	MeshBasicMaterial, Mesh,
	OrbitControls, TransformControls,
	BufferGeometry, Geometry, TextGeometry, MeshPhongMaterial,
} = THREE;
const {
	colors, dimensions,
} = require('assetdata');
const TweenMax = require('TweenMax');
const TweenLite = require('TweenLite');


const {Sine, SlowMo, Power0, Power1, Power2, Power3, Power4} = TweenLite;
const DEFAULT_SLIDE_SPEED = 5;

class Transform extends makeComponent(THREE.Object3D) {
	OnAttachComponent(entity) {
		//console.info('Transform.OnAttachComponent(entity);');
		THREE.Object3D.call(this);
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		scene.add(this);
	}
	OnDetachComponent(entity) {
		if(this.parent) this.parent.remove(this);
	}
	fromJSON(json = {}) {
		//console.info('Transform.fromJSON(json);');
		const {
			position = this.position,
			rotation = this.rotation,
			scale = this.scale,
			parent
		} = json;
		this.position.set(
			position.x || this.position.x,
			position.y || this.position.y,
			position.z || this.position.z
		);
		this.rotation.set(
			rotation.x || this.rotation.x,
			rotation.y || this.rotation.y,
			rotation.z || this.rotation.z,
			rotation.order || this.position.order
		);
		this.scale.set(scale.x, scale.y, scale.z);
		if(parent !== undefined) parent.add(this);
		return this;
	}
	toJSON() {
		const {rotation: r} = this;
		return {
			position: Object.assign({}, this.position),
			rotation: {x: r.x, y: r.y, z: r.z, order: r.order},
			scale: Object.assign({}, this.scale),
		};
	}
}

class Scene extends makeComponent(THREE.Scene) {
	OnAttachComponent(entity) {
		super.OnAttachComponent(entity);
		window.scene = this;
	}
}

class Renderer extends makeComponent(THREE.WebGLRenderer) {
	OnAttachComponent(entity) {
		THREE.WebGLRenderer.call(this, {antialias: true, alpha: true});
		this.setClearColor(0x000000, 0);
		this.setPixelRatio(window.devicePixelRatio);
		this.setSize(window.innerWidth, window.innerHeight);
		//this.shadowMap.enabled = true;
		//this.shadowMap.type = THREE.PCFSoftShadowMap;
		this.domElement.tabIndex = -1;
		this.domElement.style.position = 'relative';
		this.domElement.style.display = 'block';
	}
}

class Camera extends makeComponent(THREE.PerspectiveCamera) {
	OnAttachComponent(entity) {
		THREE.PerspectiveCamera.call(this, 
			50,
			window.innerWidth / window.innerHeight,
			0.1, 2000
		);
		this.position.set(0, 0, 100);
		this.up = new Vector3(0, 1, 0);
		this.lookAt(new Vector3(0, 0, 0));
	}
}

class Runtime extends XenoRuntime {
	OnAttachComponent(entity) {
		const renderer = entity.requireComponent(Renderer);
		const scene = entity.requireComponent(Scene);
		const camera = entity.requireComponent(Camera);
		this.init({renderer, scene, camera});
		/*
		this.on(XenoRuntime.EVENT_READY, function(event) {
			console.error('EVENT_READY');
			console.log(event);
			console.log(this);
			entity.dispatchEvent('ready', this);
		});
		setTimeout((event) => {
			console.error('setTimeout');
			console.log(event);
			console.log(this);
			//entity.dispatchEvent('ready', this);
		}, 0);
		*/
	}
}

class MouseEvents extends makeComponent(MouseHandler) {
	OnAttachComponent(entity) {
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		const camera = entities.findComponent(Camera);
		const {domElement} = entities.findComponent(Renderer);
		MouseHandler.call(this, {domElement, camera, scene});
	}
}

class Cursor extends makeComponent(MouseCursor) {
	OnAttachComponent(entity) {
		const {entities} = this;
		const scene = entities.findComponent(Scene);
		const mouseEvents = entity.requireComponent(MouseEvents);
		MouseCursor.call(this, {scene});
		this.attach(mouseEvents);
		this.cursor.scale.set(0.02, 0.02, 0.02);
	}
}

class MeshComponent extends makeComponent(THREE.Mesh) {
	OnAttachComponent(entity) {
		const transform = entity.requireComponent(Transform);
		transform.add(this);
	}
	OnDetachComponent(entity) {
		if(this.parent) this.parent.remove(this);
	}
	fromJSON({position, scale} = {}) {
		if(position) this.position.copy(position);
		if(scale) this.scale.copy(scale);
		return this;
	}
	toJSON() {
		return {
			position: Object.assign({}, this.position),
			scale: Object.assign({}, this.scale),
		};
	}
}

class Collider extends MeshComponent {
	constructor() {
		super();
		//this.minBounds = new Vector3(0.001, 0.001, 0.001);
		this.padding = new Vector3(0.2, 0.2, 0.2);
		this.delegatedEvents = ['mousedown', 'mouseup', 'mouseenter', 'mouseleave'];
		this.handlers = ['mousedown', 'mouseup', 'mouseenter', 'mouseleave'];
	}
	OnAttachComponent(entity) {
		//console.info('Collider.OnAttachComponent(entity);');
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new MeshBasicMaterial({
			color: colors.Teal300,
			transparent: true,
			opacity: 0.1,
			visible: true,
			depthWrite: false,
		});
		Mesh.call(this, geometry, material);
		this.name = 'collider';
		this.receiveMouseEvents = true;
		super.OnAttachComponent(entity);
		const transform = entity.requireComponent(Transform);
		this.setFromMesh(transform);
		this.delegatedEvents.forEach(event => {
			this.handlers[event] = entity.delegate(event);
			this.addEventListener(event, this.handlers[event]);
		});
	}
	OnDetachComponent(entity) {
		//console.info('Collider.OnDetachComponent(entity);');
		this.delegatedEvents.forEach(event =>
			this.removeEventListener(event, this.handlers[event]));
		super.OnDetachComponent(entity);
	}
	setFromMesh(mesh) {
		const transform = this.entity.requireComponent(Transform);
		transform.remove(this);
		const bounds = new Box3().setFromObject(mesh);
		transform.add(this);
		if(bounds.isEmpty()) {
			this.position.set(0, 0, 0);
			this.scale.copy(this.padding);
		} else {
			bounds.getSize(this.scale);
			this.scale.add(this.padding);
			this.position
				.addVectors(bounds.min, bounds.max)
				.multiplyScalar(0.5)
				.sub(transform.position);
		}
	}
	refresh() {
		this.setFromMesh(this.entity.transform);
	}
}

class OrbitCamComponent extends makeComponent(OrbitControls) {
	OnAttachComponent(entity) {
		const {entities} = entity;
		const renderer = entities.findComponent(Renderer);
		const camera = entities.findComponent(Camera);
		OrbitControls.call(this, camera, renderer.domElement);
		this.camera = camera;
		this.userPanSpeed = 0.1;
		this.setCamera(camera.position);
		this._targetDistance = undefined;
	}
	setCamera(position, target) {
		const {entity, cameraTarget, camera} = this;
		target = target || cameraTarget || new Vector3(0, 0, 0);
		camera.position.copy(position);
		camera.lookAt(target);
		this._targetDistance = camera.position.clone().sub(target).length();
		camera.updateMatrix();
		camera.near = 0.1;
		this.position0.copy(position);
		this.target0.copy(target);
		this.reset();
		this.cameraTarget = target;
	}
	getTarget() {
		const {camera} = this;
		const direction = camera.getWorldDirection();
		return camera.position.clone().add(direction.multiplyScalar(this._targetDistance));
	}
	slideCamera(endPosition, endTarget, speed = DEFAULT_SLIDE_SPEED, onComplete) {
		const startPosition = this.camera.position.clone();
		const startTarget = this.getTarget();
		const position = new Vector3();
		const target = new Vector3();
		if(typeof speed === 'function') {
			onComplete = speed;
			speed = DEFAULT_SLIDE_SPEED;
		}
		const distance = (
			startPosition.clone().sub(endPosition).length() +
			startTarget.clone().sub(endTarget).length()
			) * 0.5;
		const duration = Math.min(2, Math.max(0.1, distance / speed));
		const update = progress => this.setCamera(
			position.lerpVectors(startPosition, endPosition, progress),
			target.lerpVectors(startTarget, endTarget, progress)
		);
		TweenMax.to({}, duration, {
			ease: Power3.easeInOut,
			onUpdate: function() {update(this.ratio);},
			onComplete
		});
	}
	fromJSON({position = this.camera.position, target = this.cameraTarget}) {
		this.setCamera(position, target);
		return this;
	}
	toJSON() {
		const {camera = {}, cameraTarget} = this;
		return {
			position: Object.assign({}, camera.position),
			target: Object.assign({}, cameraTarget),
		};
	}
}

class TransformHandle extends makeComponent(TransformControls) {
	constructor() {
		super();
		this.controlInUse = false;
		this.handleControlMousedown = this.handleControlMousedown.bind(this);
		this.handleControlMouseup = this.handleControlMouseup.bind(this);
		this.handleAnimationFrame = this.handleAnimationFrame.bind(this);
	}
	OnAttachComponent(entity) {
		const {entities} = entity;
		const Scene = entities.findComponent('Scene');
		const renderer = entities.findComponent('Renderer');
		const camera = entities.findComponent('Camera');
		const _props = Object.create(null);
		Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach(key => _props[key] = this[key]);
		TransformControls.call(this, camera, renderer.domElement);
		Object.keys(this)
		.filter(key => (_props[key] !== undefined) && (_props[key] !== this[key]))
		.forEach(key => {
			this['_'+key] = this[key];
			this[key] = _props[key];
		});
		Scene.add(this);
		this.addEventListener('mouseDown', this.handleControlMousedown);
		this.addEventListener('mouseUp', this.handleControlMouseup);
	}
	handleControlMousedown(event) {
		this.controlInUse = true;
	}
	handleControlMouseup(event) {
		this.controlInUse = false;
	}
	attach(transform) {
		//console.info('TransformHandle.attach(transform);');
		if(transform === this.object) return;
		if(!this.controlInUse) {
			cancelAnimationFrame(this.rafId);
			this._attach(transform);
			this.rafId = requestAnimationFrame(this.handleAnimationFrame);
		}
	}
	detach(transform) {
		//console.info('TransformHandle.detach(transform);');
		if(transform !== undefined && transform !== this.object) return;
		if(!this.controlInUse) {
			if(this.object && this.object.entity) this.object.entity.removeEventListener('destroy', this.handleRemoveEntity);
			this._detach();
			cancelAnimationFrame(this.rafId);
		}
	}
	handleAnimationFrame(time) {
		this.update();
		this.rafId = requestAnimationFrame(this.handleAnimationFrame);
	}
}

class FontLoaderComponent extends makeComponent(THREE.FontLoader) {}

class TextureLoaderComponent extends makeComponent(THREE.TextureLoader) {
	constructor() {
		super();
		this.cache = {};
	}
	OnAttachComponent(entity) {
		super.OnAttachComponent(entity);
		this.crossOrigin = 'Anonymous';
	}
	load(url) {
		if(!this.cache[url]) this.cache[url] = super.load(url);
		return this.cache[url];
	}
}

class CSSFontLoaderComponent {
	constructor() {
		this.cache = {};
	}
	waitForFont({url, family, style = 'normal', weight = 'normal', timeout = 100, interval = 5}) {
		return new Promise((resolve, reject) => {
			const ctx = document.createElement('canvas').getContext('2d');
			ctx.font = weight+' '+style+' 60px "'+family+'"';
			const startWidth = ctx.measureText('1').width;
			const timeoutId = setTimeout(() => {
				//console.log('timeout!');
				clearTimeout(timeoutId);
				clearInterval(intervalId);
				reject(new Error('Font loading timed out for \''+ctx.font+'\''));
			}, timeout);
			const intervalId = setInterval(() => {
				const width = ctx.measureText('W').width;
				//console.log('interval!', width, startWidth);
				if(width !== startWidth) {
					clearTimeout(timeoutId);
					clearInterval(intervalId);
					resolve();
				}
			}, interval);
		});
	}
	loadFont({url, family, style, weight}) {
		return fetch(url)
		.catch(err => {
			console.error('FETCH ERROR: "%s", trying XHR...', err.message);
			// Try XHR...
			return new Promise(function(resolve, reject) {
				var xhr = new XMLHttpRequest();
				xhr.onload = () => resolve(new Response(xhr.responseText, {status: xhr.status}));
				xhr.onerror = () => reject(new TypeError('Local request failed'));
				xhr.open('GET', url);
				xhr.send(null);
			});
		})
		.then(res => res.blob())
		.then(res => {
			const blobUrl = window.URL.createObjectURL(res);
			const format = 'woff';
			const tag = document.createElement('style');
			tag.type = 'text/css';
			tag.rel = 'stylesheet';
			tag.innerHTML = '@font-face {\n'+
				'font-family: "'+family+'";\n'+
				'font-style: '+style+';\n'+
				'font-weight: '+weight+';\n'+
				'src: url('+blobUrl+') format("'+format+'");\n'+
			'}';
			document.getElementsByTagName('head')[0].appendChild(tag);
		});
	}
	load(font) {
		const cacheKey = this.getKey(font);
		if(!this.cache[cacheKey]) {
			this.cache[cacheKey] = this
				.loadFont(font)
				.then(() => this.waitForFont(font));
		}
		return this.cache[cacheKey];
	}
	getKey(font) {
		return JSON.stringify(font);
	}
}

class Text extends MeshComponent {
	constructor() {
		super();
		var _value = 'Text';
		this.text = 'Text';
		//this.fontUrl = '/fonts/ProximaNovaCnLt_Bold.json';
		this.fontUrl = 'fonts/Belwe Bd BT_Bold.json';
		this.font = undefined;
		this.size = 1;
		this.fontStatus = 0;
		Object.defineProperties(this, {
			value: {
				get: () => _value,
				set: val => {
					_value = val;
					this.createTextGeometry();
				}
			}
		});
	}
	OnAttachComponent(entity) {
		//console.info('TextComponent.OnAttachComponent(entity);');
		entity.requireComponent(FontLoaderComponent);
		const geometry = new BufferGeometry();
		const material = new MeshPhongMaterial({
			color: 0xffffff,
			shading: THREE.FlatShading,
		});
		Mesh.call(this, geometry, material);
		this.name = 'text';
		super.OnAttachComponent(entity);
	}
	createTextGeometry() {
		//console.info('TextComponent.createTextGeometry(); fontStatus:', this.fontStatus);
		const {entity, entities} = this;
		//const fontLoader = entity.requireComponent(FontLoaderComponent);
		const fontLoader = entities.findComponent(FontLoaderComponent);
		if(this.fontStatus === 0) {
			fontLoader.load(this.fontUrl, font => {
				this.fontStatus = 1;
				this.font = font;
				this.createTextGeometry();
			});
			return;
		}
		/*
			const geometry = new Geometry();
			const posMat = new Matrix4();
			this.value.split('\n').forEach((line, idx) => {
				//posMat.setPosition(new Vector3(0, idx * 1, 0));
				console.log('line:', idx, line, new Vector3(0, idx * 1, 0), posMat.toArray().join(', '));
				console.log('%s\n%s',
					posMat.toArray().join(', '),
					posMat.setPosition(new Vector3(0, idx * 1, 0)).toArray().join(', '));
				const lineGeo = new TextGeometry(line, {
					font: this.font,
					size: 1,
					height: 1,
					curveSegments: 0,
					bevelEnabled: false,
					bevelThickness: 0,
					bevelSize: 0,
					//material: 0,
					//extrudeMaterial: 1
				});
				lineGeo.translate(0, 0.1, 0);
				geometry.merge(lineGeo);
			});
		*/
		//singleGeometry.merge(boxMesh.geometry, boxMesh.matrix);
		const geometry = new TextGeometry(this.value, {
			font: this.font,
			size: 1,
			height: 1,
			curveSegments: 0,
			bevelEnabled: false,
			bevelThickness: 0,
			bevelSize: 0,
			//material: 0,
			//extrudeMaterial: 1
		});
		geometry.rotateX(1.5 * Math.PI);
		geometry.computeBoundingBox();
		const size = geometry.boundingBox.getSize();
		const zScale = 1 / size.z;
		geometry.scale(zScale, zScale, zScale);
		size.multiplyScalar(zScale);
		geometry.translate(-0.5 * size.x, 0, 0);
		geometry.computeBoundingBox();
		geometry.computeVertexNormals();
		this.geometry = geometry;
	}
	fromJSON(json) {
		super.fromJSON(json);
		if(json.value) this.value = json.value;
		return this;
	}
	toJSON() {
		const {value} = this;
		return Object.assign(super.toJSON(), {value});
	}
}

class MaterialComponent extends makeComponent(THREE.MeshPhongMaterial) {}

class PhongMaterial extends MaterialComponent {
	OnAttachComponent(entity) {
		//console.info('PhongMaterial.OnAttachComponent(entity);');
		THREE.MeshPhongMaterial.call(this, {
			color: 0xffffff,
			//specular: 0x009900,
			shininess: 550,
			emissive: 0xffffff,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.95,
			/*
				color: 0xff0000, 
				//specular: 0x009900,
				shininess: 550, 
				emissive: 0xff0000,
				emissiveIntensity: 0.5,
				transparent: true,
				opacity: 0.8,
			*/
		});
		this.needsUpdate = true;
	}
	OnDetachComponent(entity) {
	}
	fromJSON(json) {
		//console.info('PhongMaterial.fromJSON(json);');
		const {
			color = this.color,
			shininess = this.shininess,
			emissive = this.emissive,
			emissiveIntensity = this.emissiveIntensity,
			transparent = this.transparent,
			opacity = this.opacity,
		} = json;
		/*
		console.log(JSON.stringify({
			color,
			shininess,
			emissive,
			emissiveIntensity,
			transparent,
			opacity
		}, null, '  '));
		*/
		this.color.copy(new THREE.Color(color));
		this.shininess = shininess;
		this.emissive.copy(new THREE.Color(emissive));
		this.emissiveIntensity = emissiveIntensity;
		this.transparent = transparent;
		this.opacity = opacity;
		this.needsUpdate = true;
		return this;
	}
	toJSON() {
		//console.info('PhongMaterial.toJSON();');
		const {
			color,
			shininess,
			emissive,
			emissiveIntensity,
			transparent,
			opacity,
		} = this;
		return {
			color: `#${color.getHexString()}`,
			shininess,
			emissive: `#${emissive.getHexString()}`,
			emissiveIntensity,
			transparent,
			opacity,
		};
	}
}

class GeometryComponent extends makeComponent(THREE.Geometry) {}

class BoxGeometryComponent extends GeometryComponent {
	OnAttachComponent(entity) {
		//console.info('BoxGeometryComponent.OnAttachComponent(entity);');
		THREE.BoxGeometry.call(this, 1, 1, 1);
	}
	fromJSON({position, scale} = {}) {
		return this;
	}
	toJSON() {
		return {
		};
	}
}

class IcosahedronGeometryComponent extends GeometryComponent {
	OnAttachComponent(entity) {
		//console.info('IcosahedronGeometryComponent.OnAttachComponent(entity);');
		THREE.IcosahedronGeometry.call(this, 1, 0);
	}
	fromJSON({position, scale} = {}) {
		return this;
	}
	toJSON() {
		return {
		};
	}
}

class SphereGeometryComponent extends GeometryComponent {
	OnAttachComponent(entity) {
		//console.info('BoxGeometryComponent.OnAttachComponent(entity);');
		THREE.SphereGeometry.call(this, 0.5, 16, 16);
	}
	fromJSON({radius = 0.5, widthSegments = 16, heightSegments = 16} = {}) {
		this.fromBufferGeometry(new THREE.SphereBufferGeometry(radius, widthSegments, heightSegments));
		return this;
	}
	toJSON() {
		return {
		};
	}
}

class GenericMeshComponent extends MeshComponent {
	OnAttachComponent(entity) {
		//console.info('GenericMeshComponent.OnAttachComponent(entity);');
		const geometry = entity.getComponent('GeometryComponent');
		const material = entity.getComponent('MaterialComponent');
		THREE.Mesh.call(this, geometry, material);
		//this.material.needsUpdate = true;
		super.OnAttachComponent(entity);
	}
}


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Transform,
		Scene,
		Renderer,
		Camera,
		Runtime,
		MouseEvents,
		Cursor,
		MeshComponent,
		Collider,
		OrbitCamComponent,
		TransformHandle,
		FontLoaderComponent,
		TextureLoaderComponent,
		CSSFontLoaderComponent,
		Text,
		MaterialComponent, PhongMaterial,
		GeometryComponent, BoxGeometryComponent, IcosahedronGeometryComponent, SphereGeometryComponent,
		GenericMeshComponent,
	};
	module.exports.ecsTHREE = module.exports;
}
})();