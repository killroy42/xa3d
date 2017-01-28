(() => {

class Accelerator {
	constructor(maxA, maxV) {
		this.maxA = maxA;
		this.maxV = maxV;
		this.reset();
	}
	reset() {
		this.velocity = 0;
	}
	calcAccel(x, dt) {
		const v = this.velocity;
		const maxA = this.maxA;
		if(dt === 0) return 0;
		const signX = (x < 0)?-1:1;
		const a = signX * (Math.sqrt(Math.abs(1 + (2 * x) / (maxA * dt * dt))) * maxA - (v * signX) / dt - maxA);
		return Math.min(maxA, Math.max(-maxA, a));
	}
	update(x, dt) {
		const a = this.calcAccel(x, dt);
		this.velocity = Math.max(-this.maxV, Math.min(this.maxV, this.velocity + a * dt));
		return this.velocity * dt;
	}
}

if(typeof module !== 'undefined' && ('exports' in module)) {
	module.exports = Accelerator;
}
})();