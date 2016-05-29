(function() {
	/* jshint validthis: true */
	'use strict';
	var THREE = require('THREE');


	function createBoard(boardTex, boardAlpha) {
		var material = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			//map: boardTex,
			//alphaMap: boardAlpha,
			transparent: true
		});
		var board = new THREE.Object3D();
		var boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(1440, 1060), material);
		board.name = 'Board';
		Promise.all([boardTex.promise, boardAlpha.promise])
		.then(function() {
			boardTex.minFilter = THREE.LinearFilter;
			boardAlpha.minFilter = THREE.LinearFilter;
			material.map = boardTex;
			material.alphaMap = boardAlpha;
			material.needsUpdate = true;
		});
		boardMesh.receiveShadow = true;
		boardMesh.renderOrder = -1;
		boardMesh.receiveMouseEvents = true;
		board.add(boardMesh);
		boardMesh.position.set(0, -50, 0);
		return board;
	}


	if(typeof module !== "undefined" && ('exports' in module)){
		module.exports = {};
		module.exports.createBoard = createBoard;
	}
})();