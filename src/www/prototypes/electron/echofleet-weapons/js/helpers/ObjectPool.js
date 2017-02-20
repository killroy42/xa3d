(() => {

/* TODO:
	ObjectPool.contract());
*/

class ObjectPool {
	constructor(T) {
		const freeList = this._freeList = [];
		this._count = 0;
		this._T = T;
		Object.defineProperties(this, {
			size: {get: () => this._count},
			free: {get: () => freeList.length},
			used: {get: () => this._count - freeList.length},
		});
	}
	aquire() {
		if (this._freeList.length <= 0) {
			this.expand(Math.round(this._count * ObjectPool.GROWTHFACTOR) + 1);
		}
		const item = this._freeList.pop();
		if (item.__init) {
			item.__init();
		} else {
			//this._T.call(item);
		}
		return item;
	}
	release(item) {
		this._freeList.push(item);
	}
	expand(count = 1) {
		var i = count; while(i--) this._freeList.push(new this._T());
		this._count += count;
	}
}
ObjectPool.GROWTHFACTOR = 0.2;

class PoolManager {
	constructor() {
		this._pools = {};
	}
	getPool(T) {
		if(this._pools[T] === undefined) {
			this._pools[T] = new ObjectPool(T);
		}
		return this._pools[T];
	}
	aquire(T) {
		const pool = this.getPool(T);
		return pool.aquire();
	}
	release(item) {
		const pool = this.getPool(item.constructor);
		pool.release(item);
	}
}

if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {ObjectPool, PoolManager};
	module.exports.objectPooling = module.exports;
}
})();