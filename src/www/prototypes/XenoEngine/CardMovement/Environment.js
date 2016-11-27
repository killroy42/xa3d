(() => {
const THREE = require('THREE');
const assetdata = require('assetdata');
const {colors, dimensions} = assetdata;
const {
	Vector3,
	PlaneGeometry, MeshPhongMaterial, Mesh, GridHelper, Geometry,
	Line, LineBasicMaterial,
	AmbientLight, SpotLight,

	//Vector3, OrbitControls, PlaneGeometry, MeshPhongMaterial,
	//Mesh, GridHelper, Geometry,
} = THREE;
//const {Entity, System, EntityManager, createComponent, makeComponent} = require('XenoECS');
const {Transform} = require('ecsTHREE');
	
class Environment {
	OnAttachComponent(entity) {
		const transform = entity.requireComponent(Transform);
		transform.add(this.floor = this.createFloor());
		transform.add(this.floorGrid = this.createFloorGrid());
		const screenOutline = this.createOutline({
			width: dimensions.unitScale.screen.width,
			height: dimensions.unitScale.screen.height,
			color: colors.grey['600']
		});
		screenOutline.name = 'screen';
		screenOutline.position.set(0, 0.001, 0);
		transform.add(screenOutline);
		const gameOutline = this.createOutline({
			width: dimensions.unitScale.board.width,
			height: dimensions.unitScale.board.height,
			color: colors.grey['600']
		});
		gameOutline.name = 'game';
		gameOutline.position.set(0, 0.001, 0);
		transform.add(gameOutline);
		const boardOutline = this.createOutline({
			width: dimensions.unitScale.board.width - 1,
			height: dimensions.unitScale.board.height - 1,
			color: colors['Blue Grey']['900']
		});
		boardOutline.name = 'board';
		boardOutline.position.set(0, 0.001, 0);
		transform.add(boardOutline);
		this.createLights();
	}
	createFloor({size = 100, color = colors.grey900} = {}) {
		const geometry = new PlaneGeometry(size, size, size, size);
		const material = new MeshPhongMaterial({color});
		const floor = new Mesh(geometry, material);
		floor.name = 'floor';
		floor.rotateX(-90 * Math.PI / 180);
		floor.renderOrder  = -1;
		floor.receiveMouseEvents = true;
		return floor;
	}
	createFloorGrid({size = 100, colorCenterLine = colors.grey700, colorGrid = colors.grey800} = {}) {
		const floorGrid = new GridHelper(size / 2, size, colorCenterLine, colorGrid);
		floorGrid.name = 'floorGrid';
		floorGrid.position.set(0, 0.001, 0);
		return floorGrid;
	}
	createOutline({width, height, color}) {
		const geometry = new Geometry();
		geometry.vertices.push(
			new Vector3(-0.5, 0, -0.5),
			new Vector3( 0.5, 0, -0.5),
			new Vector3( 0.5, 0,  0.5),
			new Vector3(-0.5, 0,  0.5),
			new Vector3(-0.5, 0, -0.5)
		);
		geometry.scale(width, 1, height);
		const material = new LineBasicMaterial({color});
		return new Line(geometry, material);
	}
	createLights() {
		const {entity} = this;
		const transform = entity.requireComponent(Transform);
		const ambientLight = new AmbientLight(0x404040);
		const spotLight = new SpotLight(0xffffff, 0.8, 100, 45 * Math.PI/180, 1, 0.1);
		spotLight.position.set(6, 16, 3);
		spotLight.target.position.set(0, 0, 0);
		spotLight.castShadow = true;
		spotLight.shadow.bias = -0.000001;
		spotLight.shadow.camera.near = 1;
		spotLight.shadow.camera.far = 100;
		spotLight.shadow.camera.fov = 75;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		transform
			.add(ambientLight)
			.add(spotLight);
	}
}

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		Environment
	};
}

})();