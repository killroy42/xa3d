(function() {

var trackerServerPath = '/tracker/server/';
var boatdataPath = '//dev.xenocards.com:88/tracker/server/boatdata.cfm';
var raceStart, raceStop;

// /tracker/server/boatdata.cfm?anticache=64335633
// json:{"action":"get_boatdata","start_id":139142,"output":"plain","race_id":"20"}

function getData(path, opts) {
	console.time('fetch');
	return fetch(path, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},	
		body: 'json=' + encodeURIComponent(JSON.stringify(opts))
	})
	.then(function(res) {
		console.timeEnd('fetch');
		console.time('text');
		return res.text();
	})
	.then(function(text) {
		console.timeEnd('text');
		text = text.replace(/\\'/g, '\'');
		var segs = text.split('\r\n');
		var json = JSON.parse(segs[0]);
		segs.shift();
		json.boatdata = segs.map(function(seg) {
			var parts = seg.split(':');
			return {
				entrantId: parts[0],
				dt: parts[1],
				points: parts[2].split('|').map(function(pointData) {
					var parts = pointData.split(',');
					return {
						lat: parseFloat(parts[0]),
						lon: parseFloat(parts[1]),
						speed: parseFloat(parts[2]),
						course: parseFloat(parts[3]),
						mins: parseFloat(parts[4]),
					};
				})
			};
		});
		return json;
	});
}

/*
function main() {
	getData(trackerServerPath, {action: 'get_divisions', race_id: 20})
		.then(function(res) { console.log(res.divisions); });
	getData(trackerServerPath, {action: 'get_entrants', race_id: 20})
		.then(function(res) { console.log(res.entrants); });
	getData(boatdataPath, {action: 'get_boatdata', start_id: 0, race_id: 20, output: 'plain'})
		.then(function(res) { console.log(res); });
}
*/

function initViewer() {
		var viewer = new Cesium.Viewer('map', {
		baseLayerPicker: false,
		//animation: true,
		//timeline: true,
		//fullscreenButton: false,
		vrButton: false,
		geocoder: false,
		homeButton: false,
		infoBox: false,
		sceneModePicker: false,
		selectionIndicator: false,
		navigationHelpButton: false,
		navigationInstructionsInitiallyVisible: false,
		//debugWireframe: true,
		//clock: false,
		scene3DOnly: true,
		creditContainer: 'credits',
		imageryProvider: Cesium.createOpenStreetMapImageryProvider({
			//url: 'https://a.tile.openstreetmap.org/'
			url: '//dev.xenocards.com:8000/',
			fileExtension: 'jpg',
			minimumLevel: 0,
			maximumLevel: 22,
			proxy: {
				getURL: function(url) {
					var m = url.match(/\/([0-9]+)\/([0-9]+)\/([0-9]+)\./);
					//console.log(m[1], m[2], m[3]);
					var max = Math.pow(2, m[1]) - 1;
					var x = m[1];
					var y = m[2];
					var z = m[3];
					var subdomains, proxyUrl, subdomain = '';
					//var host = '//localhost:8000/';
					//var host = '//oatile1.mqcdn.com/tiles/1.0.0/sat/';
					//var host = '//a.tile.openstreetmap.org/';
					//var host = '//localhost:8888/';
					var host = 'tile3.f4map.com/tiles/f4_2d/';
					var ext = 'png';
					//z = max - m[3];
					subdomains = 'abcd';
					//subdomains = '1234';
					//subdomain = 'tile'+subdomains[Math.floor(Math.random() * subdomains.length)]+'.';
					//var proxyUrl = 'http://'+subdomain+host+x+'/'+y+'/'+z+'.'+ext;
					subdomain = subdomains[Math.floor(Math.random() * subdomains.length)]+'.';
					var token = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpbG10dnA3NzY3OTZ0dmtwejN2ZnUycjYifQ.1W5oTOnWXQ9R1w8u3Oo1yA';
					proxyUrl = 'https://'+subdomain+'tiles.mapbox.com/v4/mapbox.satellite/'+x+'/'+y+'/'+z+'.webp?access_token='+token;
					//proxyUrl = 'https://a.tiles.mapbox.com/v4/mapbox.satellite/'+x+'/'+y+'/'+z+'.webp?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpbG10dnA3NzY3OTZ0dmtwejN2ZnUycjYifQ.1W5oTOnWXQ9R1w8u3Oo1yA';
					//console.log('PROXY:', url, proxyUrl);
					return proxyUrl;
				}
			}
		}),
		terrainProvider: new Cesium.CesiumTerrainProvider({
			url: 'https://assets.agi.com/stk-terrain/world',
			requestVertexNormals: true
		}),
		skyBox: new Cesium.SkyBox({
			sources: {
				positiveX: '/images/stars/TychoSkymap/TychoSkymapII.t3_08192x04096_80_px.jpg',
				negativeX: '/images/stars/TychoSkymap/TychoSkymapII.t3_08192x04096_80_mx.jpg',
				positiveY: '/images/stars/TychoSkymap/TychoSkymapII.t3_08192x04096_80_py.jpg',
				negativeY: '/images/stars/TychoSkymap/TychoSkymapII.t3_08192x04096_80_my.jpg',
				positiveZ: '/images/stars/TychoSkymap/TychoSkymapII.t3_08192x04096_80_pz.jpg',
				negativeZ: '/images/stars/TychoSkymap/TychoSkymapII.t3_08192x04096_80_mz.jpg'
			}
		}),
	});
	return viewer;
}

function init() {
	var viewer = initViewer();

	console.log(viewer.camera);
	console.log(viewer.camera.positionCartographic.toString());

	var scene = viewer.scene;

	var racearea = Cesium.Rectangle.fromDegrees(11, 35, 17, 39.5);
	var racestart = Cesium.Cartesian3.fromDegrees(14.51, 35.876, 2200.0);
	viewer.camera.setView({
		destination: Cesium.Cartesian3.fromDegrees(14, 34.5, 130000),
		orientation: {
			heading: Cesium.Math.toRadians(0.0),
			pitch: Cesium.Math.toRadians(-33.0),
			roll: 0.0
		}
	});

	viewer.entities.add({rectangle: {
		coordinates: racearea,
		fill: false,
		outline: true,
		outlineColor: Cesium.Color.WHITE
	}});

	/*
		var position = Cesium.Cartesian3.fromDegrees(14.52, 35.895, 40);
		var heading = Cesium.Math.toRadians(295);
		var pitch = 0;
		var roll = 0;
		var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, heading, pitch, roll);
		var entity = viewer.entities.add({
			name: 'Yacht',
			position: position,
			orientation: orientation,
			model: {
				uri: '/models/boat/yacht_03.gltf',
				minimumPixelSize: 64,
				maximumScale: 20000,
				material : Cesium.Color.GREEN.withAlpha(0.9),
				outline : true,
				outlineColor : Cesium.Color.BLACK,
				debugWireframe: true,
			}
		});
	*/
	//viewer.trackedEntity = entity;

	//var globe = viewer.scene.globe;
	//globe._surface._tileProvider._debug.wireframe = true;

	function createBoat(feedData) {
		/*
		var p = feedData.points[0];
		var position = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 40);
		var heading = Cesium.Math.toRadians(p.course-90);
		var pitch = 0;
		var roll = 0;
		var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, heading, pitch, roll);
		*/
		var m = feedData.dt.match(/([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/);
		var startDt = new Date(m[1]+'-'+m[2]+'-'+m[3]+' '+m[4]+':'+m[5]+':00 GMT+0200');
		var startJD = Cesium.JulianDate.fromDate(startDt);
    var position = new Cesium.SampledPositionProperty();
		feedData.points.forEach(function(p) {
			position.addSample(
				Cesium.JulianDate.addSeconds(startJD, p.mins*60, new Cesium.JulianDate()),
				Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 40)
			);
		});
		return {
			data: feedData,
			time: 0,
			start: startJD,
			entity: viewer.entities.add({
				name: 'Yacht: '+feedData.id,
				availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
					start: raceStart,
					stop: raceStop
				})]),
				position: position,
				//orientation: orientation,
				orientation: new Cesium.VelocityOrientationProperty(position),
				model: {
					uri: '/models/boat/yacht_03.gltf',
					minimumPixelSize: 64,
					//maximumScale: 20000,
					//material : Cesium.Color.GREEN.withAlpha(0.9),
					//outline : true,
					//outlineColor : Cesium.Color.BLACK,
					//debugWireframe: true,
				},
				path: {
					show: false,
					resolution: 1*60,
					/*
					material: new Cesium.PolylineGlowMaterialProperty({
						glowPower: 0.1,
						color: Cesium.Color.YELLOW
					}),
					*/
					material: new Cesium.ColorMaterialProperty(Cesium.Color.YELLOW),
					width: 1
				}
			})
		};
	}

	function moveBoat(boat, time) {
		boat.time = time;
		var ps = boat.data.points;
		var i = 1; while(i < ps.length && ps[i].mins < time) i++;
		if(i < ps.length) {
			var p0 = ps[i-1];
			var p1 = ps[i];
			var progress = (time - parseFloat(p0.mins)) / (p1.mins - p0.mins);
			var delta = {lon: p1.lon-p0.lon, lat: p1.lat-p0.lat};
			var position = Cesium.Cartesian3.fromDegrees(
				p0.lon + delta.lon*progress,
				p0.lat + delta.lat*progress,
				40);
			var heading = Cesium.Math.toRadians(p1.course-90);
			var pitch = 0;
			var roll = 0;
			var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, heading, pitch, roll);
			boat.entity.position = position;
			boat.entity.orientation = orientation;
		}
	}

	//getData(boatdataPath, {action: 'get_boatdata', start_id: 0, race_id: 20, output: 'plain'})

	var boatdataApiUrl = document.location.protocol+'//'+document.location.host+'/api/boatdata/race_51.json';
	console.log(document.location);
	console.log(boatdataApiUrl);
	return fetch(boatdataApiUrl)
	.then(function(res) { return res.text(); })
	.then(function(res) {
		var data = JSON.parse(res);
		data.boatdata.forEach(function(boatdata) {
			var points = boatdata.points = [];
			var pos = boatdata.pos;
			for(var i = 0; i < pos.length; i += 5) {
				points.push({mins: pos[i], lat: pos[i+1], lon: pos[i+2]});
			}
		});
		return data;
	})
	.then(function(res) {
		raceStart = Cesium.JulianDate.fromDate(new Date(res.race_start));
		raceStop = Cesium.JulianDate.fromDate(new Date(res.race_end));
		//viewer.clock.startTime = raceStart.clone();
		Cesium.JulianDate.addSeconds(raceStart, 3*60*60, viewer.clock.startTime),

		viewer.clock.stopTime = raceStop.clone();
		viewer.clock.currentTime = raceStart.clone();
		viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
		viewer.clock.multiplier = 600;
		return res.boatdata.map(createBoat);
	})
	.then(function(boats) {
		console.log(boats[0].entity);
		boats[0].entity.path.show = true;
		boats.forEach(function(boat) {
			boat.entity.position.setInterpolationOptions({
				interpolationDegree: 2,
				interpolationAlgorithm: Cesium.HermitePolynomialApproximation
			});
		});

		/*
		console.log('points.length:', boats[0].data.points.length);
		var cartographicDegrees = [];
		boats[0].data.points.forEach(function(p) {
			//console.log(p);
			cartographicDegrees.push(p.mins);
			cartographicDegrees.push(p.lon);
			cartographicDegrees.push(p.lat);
			cartographicDegrees.push(40);
		});
		czml[1].position.cartographicDegrees = cartographicDegrees;
		console.log('cartographicDegrees.length:', cartographicDegrees.length);
		console.log(czml[1].position.cartographicDegrees);
		viewer.dataSources.add(Cesium.CzmlDataSource.load(czml)).then(function(ds) { console.log('czml loaded'); });
		*/

		var time = 0;
		setInterval(function() {
			time += 1;
			boats.forEach(function(boat) {
				//moveBoat(boat, time);
			});
		}, 50);
	});
	
	/*
	setTimeout(function() {
		viewer.camera.flyTo({
			destination: racestart,
			orientation: {
				heading: Cesium.Math.toRadians(15.0),
				pitch: Cesium.Math.toRadians(-40.0),
				roll: 0.0
			}
		});
	}, 1000);
	*/

	/*
	setInterval(function() {
		console.log(
			viewer.camera.positionCartographic.latitude * 180 / Math.PI,
			viewer.camera.positionCartographic.longitude * 180 / Math.PI,
			viewer.camera.positionCartographic.height
		);
	}, 3000);
	*/
	
	/*
	var terrainProvider = new Cesium.CesiumTerrainProvider({
		url: '//assets.agi.com/stk-terrain/world',
		requestVertexNormals: true
	});
	viewer.terrainProvider = terrainProvider;
	viewer.scene.globe.enableLighting = true;
	*/

	/*
		var options = { zoom: 6.0, position: [37, 14.5]};
		var earth = new WE.map('map', options);

    //WE.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(earth);
		//WE.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg', {subdomains: '1234'}).addTo(earth);
		WE.tileLayer('http://localhost:8000/{z}/{x}/{y}.jpg', {
			tileSize: 256,
			bounds: [[-85, -180], [85, 180]],
			minZoom: 0,
			maxZoom: 16,
			tms: true
		}).addTo(earth);
	*/
}

document.addEventListener('DOMContentLoaded', init);

})();