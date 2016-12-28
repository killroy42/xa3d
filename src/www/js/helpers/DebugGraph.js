(() => {

class DebugGraph {
	constructor() {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const setCanvasSize = event => {
			const {innerWidth: width, innerHeight: height} = window;
			canvas.width = width;
			canvas.height = 400;
		};
		window.addEventListener('resize', setCanvasSize);
		setCanvasSize();
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		document.documentElement.appendChild(canvas);
		canvas.style.cssText = `
			position: absolute;
			top: 20px; left: 0;
			pointer-events: none;
		`;
		this.ctx = ctx;
		this.data = [];
		this.graphSpacing = 1;
	}
	addDataPoint(data) {
		this.data.push(data);
	}
	getRenderer() {
		return time => this.render(time);
	}
	drawGraph(n) {
		const {ctx, ctx: {canvas: {width, height}}, data, graphSpacing} = this;
		if(data.length === 0) return;
		ctx.beginPath();
		ctx.moveTo(0, (1 - data[0][n]) * (height * 0.5));
		for(var x = 1; x < data.length; x++) {
			ctx.lineTo(x * graphSpacing, (1 - data[x][n]) * (height * 0.5));
		}
		ctx.stroke();
	}
	render(time) {
		const {ctx, ctx: {canvas: {width, height}}, data, graphSpacing} = this;
		const w = width / graphSpacing;
		if(data.length > w) data.splice(0, data.length - w);
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, width, height);
		ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
		ctx.beginPath(); ctx.moveTo(0, height * 0.5); ctx.lineTo(width, height * 0.5); ctx.stroke();
		ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; this.drawGraph(0);
		ctx.strokeStyle = 'rgba(127, 127, 127, 1)'; this.drawGraph(1);
		ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; this.drawGraph(2);
		ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; this.drawGraph(3);
		ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)'; this.drawGraph(4);
		ctx.strokeStyle = 'rgba(255, 0, 255, 0.7)'; this.drawGraph(5);
		ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)'; this.drawGraph(6);
	}
}


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = DebugGraph;
}
})();