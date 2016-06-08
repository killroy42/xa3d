(function () {
	var THREE = require('THREE');
	var assetdata = require('assetdata');
	var GeometryHelpers = require('GeometryHelpers');
	var PropertyAnimator = require('PropertyAnimator');

	var cardOutline = assetdata.cardOutline;

	function CardGlow(cardShape, material) {
		var self = this;
		if(cardShape instanceof THREE.Material) {
			material = cardShape;
			cardShape = new THREE.Shape(cardOutline.map(function(p) { return new THREE.Vector2(p[0], p[1]); }));
		}
		var geometry = GeometryHelpers.extrudePath(cardShape, 1000, 3, 1.4);
		geometry.scale(1, 1, 60);
		THREE.Mesh.call(this, geometry, material);
		this.type = 'CardGlow';
		var animColor = new PropertyAnimator({
			target: this.material.uniforms.glowColor.value,
			duration: 0.1,
			states: {
				'red': new THREE.Color(0xff0000),
				'yellow': new THREE.Color(0xffff00),
				'green': new THREE.Color(0x00ff00),
			}
		});
		var animScale = new PropertyAnimator({
			target: this.material.uniforms.scale.value,
			duration: 0.3,
			states: {
				'big': new THREE.Vector2(1, 1),
				'normal': new THREE.Vector2(1, 2),
				'small': new THREE.Vector2(1, 4),
				'tiny': new THREE.Vector2(1, 20),
			}
		});
		var animAlpha = new PropertyAnimator({
			target: this.material.uniforms.alpha,
			duration: 0.3,
			states: {
				'show': {value: 1},
				'hide': {value: 0},
			},
			onStart: function() { self.visible = true; },
			onComplete: function() {
				if(this.target.value === 0) self.visible = false;
			}
		});
		this.properties = {
			color: animColor,
			scale: animScale,
			alpha: animAlpha,
		};
		this.animations = {
			hidden: {
				duration: 0,
				alpha: 'hide',
				scale: 'tiny',
				color: 'green',
			},
			hover: {
				alpha: 'show',
				scale: 'normal',
				color: 'green',
			},
			hoverProxy: {
				alpha: 'show',
				scale: 'small',
				color: 'yellow',
			},
			unhover: {
				alpha: 'hide',
				scale: 'tiny',
			},
			mousedown: {color: 'red'},
			mouseup: {color: 'green'},
			dragstart: {duration: 0.1, color: 'yellow', scale: 'small'},
			dragfinish: {scale: 'normal'},
		};
		Object.keys(this.animations).forEach(function(key) {
			if(self[key] !== undefined) throw new Error('Property collision');
			self[key] = function() { self.to(key); };
		});
		this.to('hidden');
	}
	CardGlow.prototype = Object.create(THREE.Mesh.prototype);
	CardGlow.prototype.constructor = CardGlow;
	CardGlow.prototype.to = function(state) {
		var props = this.properties;
		var anim = this.animations[state];
		var duration = anim.duration;
		for(var keys = Object.keys(anim), i = 0, l = keys.length; i < l; i++) {
			if(props[keys[i]]) {
				props[keys[i]].to(anim[keys[i]], duration);
			}
		}
	};


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = CardGlow;
	}
})();