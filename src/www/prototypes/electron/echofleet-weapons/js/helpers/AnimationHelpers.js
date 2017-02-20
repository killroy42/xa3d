(function() {
	/* jshint validthis: true */
	'use strict';

	function PropertyAnimator(opts) {
		var self = this;		
		this.props = {};
		var targetProps = opts.props || opts.target;
		for(var keys = Object.keys(targetProps), i = 0, l = keys.length; i < l; i++) {
			this.props[keys[i]] = targetProps[keys[i]];
		}
		this.duration = opts.duration || 1;
		this.target = opts.target;
		this.states = opts.states || {};
		this.onStart = opts.onStart || function() {};
		this.onComplete = opts.onComplete || function() {};
		if(opts.target && opts.onUpdate === undefined) {
			this.onUpdate = PropertyAnimator.makeOnUpdate(this.props, this.target);
		} else this.onUpdate = opts.onUpdate || function() {};
		this.tween = undefined;
		this.tweenTarget = {
			onStart: this.onStart,
			onComplete: this.onComplete,
			onUpdate: this.onUpdate
		};
	}
	PropertyAnimator.prototype = Object.create(null);
	PropertyAnimator.prototype.constructor = THREE.PropertyAnimator;
	PropertyAnimator.makeOnUpdate = function(props, target) {
		var keys = Object.keys(props);
		var len = keys.length;
		return function() {
			for(var i = 0; i < len; i++) {
				target[keys[i]] = this.target[keys[i]];
			}
		};
	};
	PropertyAnimator.prototype.to = function(target, duration) {
		if(duration === undefined) duration = this.duration;
		if(this.tween) this.tween.kill();
		if(typeof target === 'string' && this.states[target] !== undefined) {
			target = this.states[target];
		}
		if(typeof target === 'object') {
			for(var key in target) this.tweenTarget[key] = target[key];
			this.tween = TweenLite.to(this.props, duration, this.tweenTarget);
			return;
		}
		throw new Error('Invalid target props');
	};


	function animatePosition(position, vector, duration, easing, done) {
		if(duration === undefined) duration = 0.1;
		if(easing === undefined) easing = Power4.easeOut;
		/*
		return TweenMax.to({t: 0}, duration, {
			t: 1, ease: easing,
			onUpdate: function() {
				var progress = this.target.t;
				position.copy(vector);
				position.multiplyScalar(-(1-progress));
			},
			onComplete: function() {
				if(typeof done === 'function') done();
			}
		});
		*/
		var anim = {
			x: position.x+vector.x,
			y: position.y+vector.y,
			z: position.z+vector.z,
			ease: easing
		};
		if(typeof done === 'function') anim.onComplete = done;
		return TweenMax.to(position, duration, anim);
	}


	function AnimationHelpers(){}
	AnimationHelpers.prototype = Object.create(null);
	AnimationHelpers.prototype.constructor = AnimationHelpers;


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = AnimationHelpers;
		module.exports.PropertyAnimator = PropertyAnimator;
		module.exports.animatePosition = animatePosition;
	}
})();