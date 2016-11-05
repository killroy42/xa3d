(() => {
const {merge} = require('_');
const {Vector3, Object3D, LineBasicMaterial, Geometry, Line, BoxHelper} = require('THREE');
const {colors} = require('assetdata');
const PoolManager = require('PoolManager');
const {Entity, Component, System, EntityManager} = require('XenoECS');
const {Transform, SceneComponent, Collider, ControlView} = require('components');
const {KeyHandler, GuiControl, ControlHandle} = require('ecsGuiCore');

const ConstructionKit = require('ConstructionKit');

const computeSegmentData = (() => {
	const PLANE = 'y';
	const v0 = new Vector3();
	const v1 = new Vector3();
	const v2 = new Vector3();
	const v01 = new Vector3();
	const v12 = new Vector3();
	const tangent = new Vector3();
	const normal = new Vector3();
	const vecIn = new Vector3();
	const vecOut = new Vector3();
	const perp = new Vector3();
	const start = new Vector3();
	const end = new Vector3();
	const miter = new Vector3();
	return ({points, width}) => {
		const segments = [];
		const halfWidth = 0.5 * width;
		// start first segment
			v0.copy(points[0]); v0[PLANE] = 0;
			v1.copy(points[1]); v1[PLANE] = 0;
			v01.subVectors(v1, v0).normalize();
			perp.set(v01.z, v01.y, -v01.x).multiplyScalar(halfWidth);
			start.copy(v0);
			end.copy(v1);
		for(var i = 2; i < points.length; i++) {
			// complete segment at corner
				v2.copy(points[i]); v2[PLANE] = 0;
				v12.subVectors(v2, v1).normalize();
				tangent.addVectors(v01, v12).normalize();
				normal.set(tangent.z, tangent.y, -tangent.x);
				miter.copy(normal).multiplyScalar(halfWidth * (1 / normal.dot(perp)));
				vecIn.subVectors(miter, perp);
				end.copy(v1).addScaledVector(v01, -vecIn.length());
				v0[PLANE] = start[PLANE] = points[i-2][PLANE];
				v1[PLANE] = end[PLANE] = points[i-1][PLANE];
				segments.push({
					v0: v0.clone(),
					v1: v1.clone(),
					start: start.clone(),
					end: end.clone(),
					perp: perp.clone(),
					miter: miter.clone()
				});
			// start next segment
				v0.copy(v1); v0[PLANE] = 0;
				v1.copy(v2);
				v01.copy(v12);
				perp.set(v01.z, v01.y, -v01.x).multiplyScalar(halfWidth);
				vecOut.subVectors(perp, miter);
				start.copy(v0).addScaledVector(v01, vecOut.length());
		}
		// end last segment
			v0[PLANE] = start[PLANE] = points[i-2][PLANE];
			v1[PLANE] = end[PLANE] = points[i-1][PLANE];
			segments.push({
				v0: v0.clone(),
				v1: v1.clone(),
				start: start.clone(),
				end: v1.clone(),
				perp: perp.clone()
			});
		return segments;
	};
})();

function Outline() {
	Line.call(this, new Geometry(), new LineBasicMaterial({color: colors.yellow200}));
}
Outline.prototype = Object.assign(Object.create(Line.prototype), {
	constructor: Outline,
	__init: function() {
		this.geometry.vertices.length = 0;
		this.geometry.verticesNeedUpdate = true;
		this.material.color.set(colors.yellow200);
	}
});

class CorridorNode extends SceneComponent {
	constructor() {
		super();
		this.segA = undefined;
		this.segB = undefined;
	}
	OnCreateMesh() {
		const segment = new Object3D();
		const outline = new Line(new Geometry(), new LineBasicMaterial({color: colors.Teal[200]}));
		outline.name = 'outline';
		outline.material.depthWrite = false;
		outline.material.depthTest = false;
		outline.material.transparent = true;
		outline.material.opacity = 0.8;
		segment.add(outline);
		const mesh = new Object3D();
		mesh.name = 'mesh';
		mesh.visible = false;
		segment.add(mesh);
		return segment;
	}
	OnUpdate(segA, segB) {
		//console.info('CorridorNode.OnUpdate(segA, segB);');
		if(segA === undefined || segB === undefined) return;
		const {object3d: t} = this.getComponent(Transform);
		const {geometry} = t.getObjectByName('outline');
		const start = segA.end;
		const pos = segA.v1;
		const end = segB.start;
		const xwA = segA.perp;
		const xwB = segB.perp;
		var inside0 = segA.end.clone().sub(xwA);
		var inside1 = pos.clone().sub(segA.miter);
		var inside2 = segB.start.clone().sub(xwB);
		var outside0 = segA.end.clone().add(xwA);
		var outside1 = pos.clone().add(segA.miter);
		var outside2 = segB.start.clone().add(xwB);
		var rightCorner = true;
		if(inside0.clone().sub(inside2).length() > outside0.clone().sub(outside2).length()) {
			[inside0, outside0] = [outside0, inside0];
			[inside1, outside1] = [outside1, inside1];
			[inside2, outside2] = [outside1, inside2];
			rightCorner = false;
		}
		geometry.vertices = [outside0, outside1, outside2, inside1];
		geometry.verticesNeedUpdate = true;
		geometry.translate(-t.position.x, -t.position.y, -t.position.z);
		const target = new Vector3();
		const {depth} = this.corrOpts.wall;
		var len;
		const {wall1, wall2} = this;
		// Wall 1
			target.subVectors(outside1, outside0);
			target.set(target.z, target.y, -target.x);
			if(rightCorner) target.negate();
			wall1.position.set(0, 0, 0);
			wall1.lookAt(target);
			wall1.position.copy(outside0)
				.lerp(outside1, 0.5	+ 0.5 * (depth / target.length()));
			wall1.scale.x = target.length() + depth;
		// Wall 2
			target.subVectors(outside2, outside1);
			target.set(target.z, target.y, -target.x);
			if(rightCorner) target.negate();
			wall2.position.set(0, 0, 0);
			wall2.lookAt(target);
			wall2.position.copy(outside2)
				.lerp(outside1, 0.5	+ 0.5 * (depth / target.length()));
			wall2.scale.x = target.length() + depth;
	}
	setMeshVisible(visible) {
		this.object3d.getObjectByName('mesh').visible = visible;
	}
}

class CorridorSegment extends SceneComponent {
	constructor() {
		super();
		this.nodeA = undefined;
		this.nodeB = undefined;
		this._segData = undefined;
	}
	OnCreateMesh() {
		const segment = new Object3D();
		const outline = new Line(new Geometry(), new LineBasicMaterial({color: colors.Yellow[200]}));
		outline.name = 'outline';
		outline.material.depthWrite = false;
		outline.material.depthTest = false;
		outline.material.transparent = true;
		outline.material.opacity = 0.8;
		segment.add(outline);
		const mesh = new Object3D();
		mesh.name = 'mesh';
		segment.add(mesh);
		return segment;
	}
	setNodes(nodeA, nodeB) {
		const transform = this.getComponent(Transform);
		this.nodeA = nodeA;
		this.nodeB = nodeB;
		this.updatePosition();
	}
	updatePosition() {
		const {nodeA, nodeB} = this;
		const transform = this.getComponent(Transform);
		transform.position.copy(nodeA.transform.position)
			.add(nodeB.transform.position)
			.multiplyScalar(0.5);
	}
	OnUpdate(segData) {
		//console.info('CorridorSegment.OnUpdate(segData);');
		this._segData = segData;
		this.updatePosition();
		const {start, end, perp} = segData;
		const {object3d: t} = this.getComponent(Transform);
		const {geometry} = t.getObjectByName('outline');
		geometry.vertices = [
			start.clone().sub(perp),
			start.clone().add(perp),
			end.clone().add(perp),
			end.clone().sub(perp),
			start.clone().sub(perp)
		];
		geometry.verticesNeedUpdate = true;
		geometry.translate(-t.position.x, -t.position.y, -t.position.z);
		const mesh = t.getObjectByName('mesh');
		mesh.position
			.set(0, 0, 0)
			.addScaledVector(start, 0.5)
			.addScaledVector(end, 0.5)
			.sub(t.position);
		mesh.lookAt(end.clone().sub(t.position));
		mesh.scale.set(1, 1, new Vector3().subVectors(end, start).length());
	}
}

class Corridor extends Component {
	constructor() {
		super();
		this.handleNodeChange = this.handleNodeChange.bind(this);
		this._nodes = [];
		this._segments = [];
		this._segmentData = undefined;
		this._width = 2;
		this._pool = new PoolManager();
		this._segmentRoot = undefined;
		this._constructionKit = undefined;
		this._corridorOpts = undefined;
		this._cache = {};
	}
	setConstructionKit(conKit) {
		this._constructionKit = conKit;
	}
	setOpts(opts) {
		this._corridorOpts = opts;
	}
	getGuiControl() {
		const em = this.getManager();
		const {guiControl} = em.queryComponents(GuiControl)[0];
		return guiControl;
	}
	OnAttachComponent(entity) {
		this.getGuiControl().addEventListener('change', this.handleNodeChange);
		this._segmentRoot = new Object3D();
		this.getComponent(Transform).add(this._segmentRoot);
	}
	OnDetachComponent(entity) {
		this.getGuiControl().removeEventListener('change', this.handleNodeChange);
		this.getComponent(Transform).remove(this._segmentRoot);
		this._segmentRoot.children.length = 0;
	}
	handleNodeChange(event) {
		if(event.target.object === undefined) {
			console.error('TransformHandle.object undefined in Corridor.handleNodeChange()');
			return;
		}
		const {entity} = event.target.object.userData;
		const {_nodes, _segments} = this;
		if(entity.hasComponent(CorridorSegment)) {
			this.updateSegment(entity);
		} else if(entity.hasComponent(CorridorNode)) {
			this.updateNode(entity);
		}
		this.update();
	}
	createNode(x, y, z) {
		const em = this.getManager();
		const object3d = this.getComponent(Transform);
		const entity = em.createEntity([Transform, Collider, ControlHandle, ControlView, CorridorNode]);
		const {transform, collider, corridor, controlView, corridorNode} = entity;
		collider.object3d.material.opacity = 0.1;
		collider.object3d.material.color.set(0xff0000);
		transform.addTo(object3d);
		transform.position.set(x, y, z);
		corridorNode.conKit = this._constructionKit;
		corridorNode.corrOpts = this._corridorOpts;
		const mesh = transform.object3d.getObjectByName('mesh');
		corridorNode.wall1 = this._constructionKit.construct({generator: 'makeCorridorWall', args: this._corridorOpts});
		mesh.add(corridorNode.wall1);
		corridorNode.wall2 = this._constructionKit.construct({generator: 'makeCorridorWall', args: this._corridorOpts});
		mesh.add(corridorNode.wall2);
		entity.update();
		return entity;
	}
	updateNode(entity) {
		const {_nodes, _segments} = this;
		const idx = _nodes.indexOf(entity);
		if(idx === -1) return;
		if(idx > 0) _segments[idx - 1].corridorSegment.updatePosition();
		if(idx < _segments.length) _segments[idx].corridorSegment.updatePosition();
	}
	createSegment(nodeA, nodeB) {
		const em = this.getManager();
		const object3d = this.getComponent(Transform);
		const entity = em.createEntity([Transform, Collider, ControlHandle, ControlView, CorridorSegment]);
		const {transform, collider, corridor, controlView, corridorSegment} = entity;
		collider.object3d.material.opacity = 0.1;
		collider.object3d.material.color.set(0x00ff00);
		transform.addTo(object3d);
		corridorSegment.setNodes(nodeA, nodeB);

		const corrMesh = this.constructCorridor(merge({}, this._corridorOpts, {width: this._width}));
		corrMesh.name = 'corridor';
		const mesh = transform.object3d.getObjectByName('mesh');
		mesh.add(corrMesh);
		
		return entity;
	}
	updateSegment(entity) {
		const {_nodes, _segments} = this;
		const idx = _segments.indexOf(entity);
		if(idx === -1) return;
		const transform = entity.getComponent(Transform);
		const nodeA = _nodes[idx];
		const nodeB = _nodes[idx + 1];
		const delta = nodeA.transform.position.clone()
			.add(nodeB.transform.position)
			.multiplyScalar(0.5)
			.sub(transform.position)
			.negate();
		nodeA.getComponent(Transform).position.add(delta);
		nodeB.getComponent(Transform).position.add(delta);
		if(idx > 0) _segments[idx - 1].corridorSegment.updatePosition();
		if(idx + 1 < _segments.length) _segments[idx + 1].corridorSegment.updatePosition();
	}
	addNode(x, y, z) {
		const {_nodes, _segments} = this;
		const node = this.createNode(x, y, z);
		_nodes.push(node);
		const len = _nodes.length;
		if(len > 1) {
			const seg = this.createSegment(_nodes[len - 2], _nodes[len - 1]);
			_segments.push(seg);
		}
		this.update();
		return node;
	}
	removeSegment(segment) {
		//console.info('Corridor.removeSegment(segment);');
		const {_segments} = this;
		_segments.splice(_segments.indexOf(segment), 1);
		segment.destroy();
	}
	removeNode(node) {
		//console.info('Corridor.removeNode(node);');
		const {_nodes, _segments} = this;
		const idx = _nodes.indexOf(node);
		if(idx === -1) return;
		const len = _nodes.length;
		_segments.filter(({corridorSegment: {nodeA, nodeB}}) => nodeA === node || nodeB === node)
			.forEach(seg => this.removeSegment(seg));
		_nodes.splice(idx, 1);
		if(len > 2 && idx > 0 && idx < len - 1) {
			const seg = this.createSegment(_nodes[idx - 1], _nodes[idx]);
			_segments.splice(idx - 1, 0, seg);
		}
		node.destroy();
		this.update();
	}
	update() {
		//console.info('Path.update();');
		const {_nodes, _segments, _width, _pool, _segmentRoot} = this;
		if(_nodes.length < 2) return;
		const _segmentData = this._segmentData = computeSegmentData({
			points: _nodes.map(({transform: {position}}) => position),
			width: _width
		});
		_segments.forEach((seg, idx, arr) => {
			seg.update(_segmentData[idx]);
			if(idx > 0) {
				_nodes[idx].update(_segmentData[idx - 1], _segmentData[idx]);
			}
			if(idx > 0 && idx < arr.length) {
				_nodes[idx].corridorNode.setMeshVisible(true);
			}
		});
	}
}

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Corridor,
	};
	module.exports.ecsCorridor = module.exports;
}
})();


// 0-1-2-3
// _0_1_2_