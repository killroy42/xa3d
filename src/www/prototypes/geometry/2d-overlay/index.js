(function() {
var THREE = require('THREE');
var enhanceTHREE = require('enhanceTHREE');
enhanceTHREE(THREE);
var THREEPrototype = require('THREEPrototype');
var initLights = require('initLights');

class UI {
	constructor() {

	}
	attach(parent) {
		const canvas = this.canvas = document.createElement('canvas');
		this.ctx = canvas.getContext('2d');
		parent.appendChild(canvas);
		canvas.style.cssText = 'position: absolute; left: 0; top: 0;';
		const onResize = (e) => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.render();
		};
		window.addEventListener('resize', onResize);
		onResize();
	}
	render(time) {
		const canvas = this.canvas;
		const ctx = this.ctx;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
		ctx.fillRect(100, 100, canvas.width - 200, canvas.height - 200);
	}
}


function Prototype_init() {
	var ui = new UI();
	
	ui.attach(document.body);
	
	ui.canvas.addEventListener('mousewheel', (e) => 
		this.renderer.domElement.dispatchEvent(new WheelEvent(e.type, e))
	);
	ui.canvas.addEventListener('mousedown', (e) => {
		const x = e.clientX;
		const y = e.clientY;
		const canvas = ui.canvas;
		const ctx = ui.ctx;
		const data = ctx.getImageData(x, y, 1, 1).data;
		var color = [data[0], data[1], data[2], data[3]];
		console.log(e.target.parentNode, x, y, color);
		const newE = new MouseEvent(e.type, e);
		if(data[3] < 64) {
			this.renderer.domElement.dispatchEvent(newE);
		} else {
			const onMove = (e) => {
				const x = e.clientX;
				const y = e.clientY;
				ui.render();
				ctx.fillStyle = 'rgba(0, 255, 0, 1)';
				ctx.fillRect(x-10, y-10, 20, 20);
			};
			const onUp = (e) => {
				canvas.removeEventListener('mousemove', onMove);
				canvas.removeEventListener('mouseup', onUp);
			};
			canvas.addEventListener('mousemove', onMove);
			canvas.addEventListener('mouseup', onUp);
		}
	}, false);
	
	this.onrender = (t) => {
	};

	this.setCamera(new THREE.Vector3(0, -1, 6), new THREE.Vector3(0, 0, 0));
	initLights(this);
	var backdrop = new THREE.Mesh(new THREE.PlaneGeometry(8, 8),
		new THREE.MeshPhongMaterial({color: 0x0000ff})
	);
	backdrop.renderOrder  = -1;
	this.scene.add(backdrop);
}
function init() {
	var prototype = new THREEPrototype();
	prototype.oninit = Prototype_init;
	prototype.start();
}

document.addEventListener('DOMContentLoaded', init);
	
})();