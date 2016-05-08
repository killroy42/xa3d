(function () {

function NetCard() {
	//console.info('new NetCard();');
	this.id = NetCard.cardId++;
	this.type = 0;
	this.position = {x: 0, y: 0, z: 0};
}
NetCard.cardId = 0;
NetCard.prototype = Object.create(null);
NetCard.prototype.constructor = NetCard;
NetCard.prototype.fromJSON = function(json) {
	if(this.id !== json.id) throw new Error('ID mismatch.');
	//this.id = json.id;
	this.type = json.type;
	this.position.x = json.x;
	this.position.y = json.y;
	this.position.z = json.z;
};
NetCard.prototype.toJSON = function() {
	return {
		id: this.id,
		type: this.type,
		x: this.position.x,
		y: this.position.y,
		z: this.position.z
	};
};



if(typeof module !== "undefined" && ('exports' in module)){
	module.exports = NetCard;
}
})();