(function() {
	
class ProcComponent {
	constructor(opts) {
		this.seed = 0;
		if(opts.seed !== undefined) this.seed = opts.seed;
	}
}

class ProcRectangle extends ProcComponent {
	constructor(opts) {
		super(opts);
		this.left = 0;
		this.top = 0;
		if(opts.left !== undefined) this.left = opts.left;
		if(opts.top !== undefined) this.top = opts.top;
		this.width = 0;
		this.height = 0;
		if(opts.width !== undefined) this.width = opts.width;
		if(opts.height !== undefined) this.height = opts.height;
	}
	normalize() {
		if(this.width < 0) {
			this.width *= -1;
			this.left -= this.width;
		}
		if(this.height < 0) {
			this.height *= -1;
			this.top -= this.height;
		}
	}
}

class Props2D {
	constructor(canvas, obj) {
		Object.defineProperties(this, {
			x: {get: () => {
				const scaleF = canvas.width / 8;
				const pos = obj.position;
				return pos.x * scaleF + Math.floor(0.5 * canvas.width);
			}},
			y: {get: () => {
				const scaleF = canvas.width / 8;
				const pos = obj.position;
				return -pos.y * scaleF + Math.floor(0.5 * canvas.height);
			}},
			w: {get: () => {
				const scaleF = canvas.width / 8;
				const scale = obj.scale;
				return scale.x * scaleF;
			}},
			h: {get: () => {
				const scaleF = canvas.width / 8;
				const scale = obj.scale;
				return scale.y * scaleF;
			}},
		});
	}
}

class GUIComponent {
	constructor(opts) {
		this.mousePos = {x: -1, y: -1};
	}
	attach(canvas, pt) {
		this.canvas = canvas;
		this.pt = pt;
		this.props = new Props2D(canvas, this.obj3d);
	}
	pointInside2d({x, y}) {
		const props = this.props;
		const dX = props.w * 0.5;
		const dY = props.h * 0.5;
		return x >= props.x-dX && x <= props.x + dX &&
			y >= props.y - dY && y <= props.y + dY;
	}
}

class GUIBox extends GUIComponent {
	constructor(opts) {
		super(opts);
		this.obj3d = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshPhongMaterial({color: 0x00ff00})
		);
		this.mouseOver = false;
		this.mouseDown = false;
	}
	mouseTranslate(dX, dY, dZ) {
		if(arguments.length === 1) {
			dZ = dX;
			dX = undefined;
			dY = undefined;
		}
		if(dX !== undefined) this.obj3d.position.x = this.onDownObjPos.x + dX;
		if(dY !== undefined) this.obj3d.position.y = this.onDownObjPos.y + dY;
		if(dZ !== undefined) this.obj3d.position.z = this.obj3d.position.z + dZ;
	}
	mouseScale(dX, dY, dZ) {
		if(arguments.length === 1) {
			dZ = dX;
			dX = undefined;
			dY = undefined;
		}
		if(dX !== undefined) this.obj3d.scale.x = Math.max(0.01, this.onDownObjScale.x + dX);
		if(dY !== undefined) this.obj3d.scale.y = Math.max(0.01, this.onDownObjScale.y + dY);
		if(dZ !== undefined) this.obj3d.scale.z = Math.max(0.01, this.obj3d.scale.z + dZ);
	}
	attach(canvas, pt) {
		super.attach(canvas, pt);
		const scene = pt.scene;
		const rendererDom = pt.renderer.domElement;
		scene.add(this.obj3d);
		const mouseDownHandler = (e) => {
			if(this.mouseOver) {
				this.mouseDown = true;
				this.mouseDownPos = Object.assign({}, this.mousePos);
				this.onDownObjPos = Object.assign({}, this.obj3d.position);
				this.onDownObjScale = Object.assign({}, this.obj3d.scale);
				canvas.addEventListener('mouseup', mouseUpHandler);
				window.addEventListener('mouseup', mouseUpHandler);
			} else {
				rendererDom.dispatchEvent(new MouseEvent(e.type, e));
			}
		};
		const mouseUpHandler = (e) => {
			this.mouseDown = false;
			canvas.removeEventListener('mouseup', mouseUpHandler);
			window.removeEventListener('mouseup', mouseUpHandler);
		};
		const mouseMoveHandler = (e) => {
			this.mousePos = {x: e.clientX, y: e.clientY};
			this.mouseOver = this.pointInside2d(this.mousePos);
			if(this.mouseDown) {
				const scaleF = canvas.width / 8;
				const dX = (this.mousePos.x - this.mouseDownPos.x) / scaleF;
				const dY = (-(this.mousePos.y - this.mouseDownPos.y)) / scaleF;
				switch(e.buttons) {
					case 1: this.mouseTranslate(dX, dY); break;
					case 2: this.mouseScale(dX, dY); break;
				}
			}
			//pt.renderer.domElement.dispatchEvent(new MouseEvent(e.type, e));
		};
		const mouseWheelHandler = (e) => {
			if(this.mouseDown) {
				const dZ = - 0.1 * Math.sign(e.deltaY);
				switch(e.buttons) {
					case 1: this.mouseTranslate(dZ); break;
					case 2: this.mouseScale(dZ); break;
				}
			} else {
				rendererDom.dispatchEvent(new WheelEvent(e.type, e));
			}
		};
		canvas.addEventListener('mousemove', mouseMoveHandler);
		canvas.addEventListener('mousewheel', mouseWheelHandler);
		canvas.addEventListener('mousedown', mouseDownHandler);
	}
	render2d(ctx, time) {
		const props = this.props;
		ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
		if(this.mouseOver) ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
		if(this.mouseDown) ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
		ctx.fillRect(props.x-props.w/2, props.y-props.h/2, props.w, props.h);
	}
	update3d(time) {
	}
}

class UI {
	constructor() {
		this.components = [];
	}
	attach(dom, pt) {
		const canvas = this.canvas = document.createElement('canvas');
		this.ctx = canvas.getContext('2d');
		this.pt = pt;
		dom.appendChild(canvas);
		canvas.style.cssText = 'position: absolute; left: 0; top: 0;';
		const onResize = (e) => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			//this.render();
		};
		window.addEventListener('resize', onResize);
		onResize();
		this.pt.onrender = (time) => this.render(time);
	}
	render(time) {
		const canvas = this.canvas;
		const ctx = this.ctx;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
		ctx.fillRect(100, 100, canvas.width - 200, canvas.height - 200);

		ctx.font = '24px "roboto mono"';
		ctx.fillStyle = 'rgba(255, 255, 255, 1)';
		ctx.textBaseline = 'top';
		ctx.fillText('time: '+Math.round(time/1000), 100, 100);
		this.components.forEach((comp) => {
			comp.render2d(ctx, time);
			comp.update3d(time);
		});
	}
	add(component) {
		this.components.push(component);
		component.attach(this.canvas, this.pt);
	}
}

function test2DUI(pt) {
	var ui = new UI();
	ui.attach(document.body, pt);
	var box = new GUIBox();
	box.obj3d.position.set(1, 1, 0);
	ui.add(box);
	ui.canvas.addEventListener('mousewheel', (e) => {
		//pt.renderer.domElement.dispatchEvent(new WheelEvent(e.type, e))
	});
	ui.canvas.addEventListener('mousedown', (e) => {
		//pt.renderer.domElement.dispatchEvent(new MouseEvent(e.type, e));
	});
}


module.exports = {
	test2DUI: test2DUI,
	ProcComponent: ProcComponent,
	ProcRectangle: ProcRectangle,
	Props2D: Props2D,
	GUIComponent: GUIComponent,
	GUIBox: GUIBox,
	UI: UI,
};

})();