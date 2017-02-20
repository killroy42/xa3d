(() => {
const THREE = require('THREE');
const {makeComponent, getComponentName} = require('XenoECS');
const {DataComponent} = require('ecsCore');
const {
	//Scene, Renderer, Camera, Runtime, MouseEvents, Cursor,
	//Transform, MeshComponent, Collider,
	MeshComponent, Collider, Transform, Renderer,
} = require('ecsTHREE');
const assetdata = require('assetdata');
const XenoCard3D = require('XenoCard3D');
const {makeRoundedRectShape} = require('GeometryHelpers');
const {
	Vector2, Vector3, Euler,
	MeshPhongMaterial,
	Geometry, BoxGeometry, SphereGeometry, ExtrudeGeometry,
	Mesh,
	TextureLoader,
	Line, LineBasicMaterial, CatmullRomCurve3,
} = THREE;
const TweenMax = require('TweenMax');
const TweenLite = require('TweenLite');
const {normalizeUVs} = require('GeometryHelpers');


const {Sine, SlowMo, Power0, Power1, Power2, Power3, Power4} = TweenLite;
const {colors, dimensions, getRandomPortraitUrl, getRandomColor} = assetdata;

class CardData extends DataComponent {
	constructor() {
		super();
		this.createProp('id', undefined);
		this.createProp('name', 'Card');
		this.createProp('color', getRandomColor());
		this.createProp('type', -1);
		this.createProp('json', {});
	}
	OnAttachComponent(entity) {
		this.initProp('id', this.entity.id);
		this.name = `Card [${this.id}]`;
	}
}

class Card {
	constructor() {
		this.meshTypes = [];
	}
	OnAttachComponent(entity) {
		//const meshTypes = [BallCard, RoundedCornersCard, XACard];
		const {meshTypes} = this;
		const collider = entity.requireComponent(Collider);
		const cardData = entity.requireComponent(CardData);
		collider.padding.set(0.2, 0.05, 0.2);
		const updateColor = (color) => {
			const cardMesh = entity.getComponent(CardMesh);
			if(cardMesh) {
				if(cardMesh instanceof XACard) {
					const portrait = assetdata.portraitPath + assetdata.portraits[color % assetdata.portraits.length];
					cardMesh.setPortrait(portrait);
				} else {
					cardMesh.material.color.set(color);
				}
			}
		};
		entity.on('datachanged', (change, data) => {
			if(change.color !== undefined && data.color !== change.color) {
				const cardMesh = entity.getComponent(CardMesh);
				if(cardMesh) cardMesh.setColor(change.color);
			}
			if(change.type !== undefined && data.type !== change.type) {
				this.setCardMesh(meshTypes[change.type]);
				/*
					if(meshTypes[change.type]) {
						entity.removeComponent(CardMesh);
						entity.addComponent(meshTypes[change.type]);
						//console.log(entity.transform.position);
						//console.log(entity.transform.children.map(child => child.position).join(', '));
						collider.setFromMesh(entity.transform);
						const cardMesh = entity.getComponent(CardMesh);
						if(cardMesh) cardMesh.setColor(data.color);
					}
				*/
			}
		});
	}
	setCardMesh(newCardMesh) {
		const {entity} = this;
		const collider = entity.requireComponent(Collider);
		const data = entity.requireComponent(CardData);
		if(newCardMesh) {
			entity.removeComponent('CardMesh');
			entity.addComponent(newCardMesh);
			//console.log(entity.transform.position);
			//console.log(entity.transform.children.map(child => child.position).join(', '));
			collider.setFromMesh(entity.transform);
			const cardMesh = entity.getComponent(CardMesh);
			if(cardMesh) cardMesh.setColor(data.color);
		}
	}
	fromJSON(json) {
		this.meshTypes = json.meshTypes;
		this.setCardMesh(this.meshTypes[this.entity.cardData.type]);
	}
	toJSON() {
		const json = super.toJSON();
		json.meshTypes = this.meshTypes.map(getComponentName);
		return json;
	}
}
//Card.MESH_TYPES = [BallCard, RoundedCornersCard, XACard];

class CardMesh extends MeshComponent {
	constructor() {
		super();
		Object.assign(this, {
			width: dimensions.unitScale.card.width,
			height: dimensions.unitScale.card.height,
			thickness: 0.05
		});
	}
	setColor(color) {
		//console.info('CardMesh.setColor(color);');
		if(this.material.color) this.material.color.set(color);
	}
}
class RoundedCornersCard extends CardMesh {
	OnAttachComponent(entity) {
		const {width, height, thickness} = this;
		const cornerRadius = 0.2;
		const shape = makeRoundedRectShape(0, 0, width, height, cornerRadius);
		const geometry = new ExtrudeGeometry(shape, {amount: thickness, bevelEnabled: false, steps: 1});
		geometry.rotateX(0.5 * Math.PI);
		geometry.translate(0, thickness, 0);
		const material = new MeshPhongMaterial();
		Mesh.call(this, geometry, material);
		super.OnAttachComponent(entity);
	}
}
class BallCard extends CardMesh {
	OnAttachComponent(entity) {
		const {width, height, thickness} = this;
		const geometry = new SphereGeometry(width / 2, 32, 32);
		geometry.scale(1, width * thickness, height / width * 0.6);
		const material = new MeshPhongMaterial();
		Mesh.call(this, geometry, material);
		super.OnAttachComponent(entity);
	}
}
class XACard extends CardMesh {
	constructor() {
		super();
		this.portrait = null;
	}
	OnAttachComponent(entity) {
		const xenoCard3D = new XenoCard3D();
		const {entities} = entity;
		const transform = entity.requireComponent(Transform);
		const collider = entity.requireComponent(Collider);
		const renderer = entities.findComponent(Renderer);
		const textureLoader = new TextureLoader();
		textureLoader.crossOrigin = 'Anonymous';
		this.loadTexture = (url) => {
			var resolverFunc;
			const texture = textureLoader.load(
				url,
				() => resolverFunc(),
				undefined,
				(err) => this.handleError(err));
			//texture.minFilter = LinearFilter;
			texture.promise = new Promise((resolve, reject) => resolverFunc = resolve);
			texture.anisotropy = renderer.getMaxAnisotropy();
			return texture;
		};
		const card = xenoCard3D.createCard(this.portrait);
		card.scale.set(0.01, 0.01, 0.01);
		card.rotateX(-0.5 * Math.PI);
		const geometry = new BoxGeometry(0.001, 0.001, 0.001);
		const material = new MeshPhongMaterial({color: colors.grey900, transparent: true, opacity: 0});
		Mesh.call(this, geometry, material);
		this.add(card);
		super.OnAttachComponent(entity);
		card.on('meshReady', () => collider.setFromMesh(transform));
	}
	setPortrait(url) {
		//console.info('XACard.setColor("%s");', url);
		const card = this.getObjectByName('card');
		this.portrait = this.loadTexture(url);
		const portraitMesh = this.getObjectByName('card.portrait');
		if(portraitMesh === undefined) {
			card.on('meshReady', () => {
				const portraitMesh = this.getObjectByName('card.portrait');
				portraitMesh.material.map = this.portrait;
			});
		} else {
			portraitMesh.material.map = this.portrait;
		}
	}
	setColor(color) {
		const portrait = assetdata.portraitPath + assetdata.portraits[color % assetdata.portraits.length];
		this.setPortrait(portrait);
	}
}

// Hearthstone / Brimstone
	const shaders = {
		vertHSCard: `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragHSCard: `
			varying vec2 vUv;
			uniform sampler2D templateTex;
			uniform sampler2D alphaTex;
			uniform vec2 dims;
			uniform float alpha;
			uniform sampler2D backTex; uniform vec2 backDims; uniform vec2 backPos;
			uniform sampler2D portraitTex; uniform vec2 portraitDims; uniform vec2 portraitPos;
			uniform sampler2D rarityTex; uniform vec2 rarityDims; uniform vec2 rarityPos;
			uniform sampler2D titleTex; uniform vec2 titleDims; uniform vec2 titlePos;
			uniform sampler2D gemTex; uniform vec2 gemDims; uniform vec2 gemPos;
			uniform sampler2D attTex; uniform vec2 attDims; uniform vec2 attPos;
			uniform sampler2D hpTex; uniform vec2 hpDims; uniform vec2 hpPos;
			uniform sampler2D textTex; uniform vec2 textDims; uniform vec2 textPos;
			vec4 paint(vec4 canvas, vec4 color) {
				return vec4(canvas.rgb * (1.0 - color.a) + color.rgb * color.a, max(canvas.a, color.a));
			}
			vec4 paintA(vec4 canvas, vec4 color, float alpha) {
				return paint(canvas, vec4(color.rgb, color.a * alpha));
			}
			vec4 clipIcon(vec4 color, vec2 uv) {
				if(uv.x < 0.0 || uv.x > 0.5 || uv.y < 0.0 || uv.y > 0.5) {
					color.a = 0.0;
				}
				return color;
			}
			vec4 getC(sampler2D tex, vec2 texDims, vec2 pos) {
				vec2 uv = vUv * dims + vec2(0.0, -dims.y + texDims.y) + vec2(-pos.x, pos.y);
				vec4 c = texture2D(tex, (uv) / texDims);
				if(uv.y < 0.0 || uv.y > texDims.y || uv.x < 0.0 || uv.x > texDims.x) c.a = 0.0;
				return c;
			}
			void main() {
				vec4 alphaC = texture2D(alphaTex, vUv);
				vec4 cardC = vec4(0.0, 0.0, 0.0, 0.0);
				//vec4 cardC = vec4(1.0, 1.0, 1.0, 1.0);
				//cardC = paint(cardC, getC(templateTex, vec2(764.0, 1100.0), vec2(0.0, 0.0)));
				//cardC = paintA(cardC, getC(backTex, backDims, backPos), alpha);
				//cardC = paintA(cardC, getC(rarityTex, rarityDims, rarityPos), alpha);
				cardC = paint(cardC, vec4(getC(backTex, backDims, backPos).rgb, alphaC.g));
				cardC = paint(cardC, vec4(getC(portraitTex, portraitDims, portraitPos).rgb, alphaC.r));
				cardC = paint(cardC, getC(rarityTex, rarityDims, rarityPos));
				cardC = paint(cardC, getC(titleTex, titleDims, titlePos));
				cardC = paint(cardC, getC(gemTex, gemDims, gemPos));
				cardC = paint(cardC, getC(attTex, attDims, attPos));
				cardC = paint(cardC, getC(hpTex, hpDims, hpPos));
				cardC = paint(cardC, getC(textTex, textDims, textPos));
				//if(cardC.r < 0.2) discard;
				gl_FragColor = cardC;
			}
		`,
	};
	const getProp = prop => item => item[prop];
	const joinParts = parts => parts.reduce((s, cur, idx, arr) => s+(arr[idx-1] && arr[idx-1].br?' ':'')+cur.s, '');
	const textToWords = text => text.replace(/([\s])/g, '|').split('|');
	const wordsToTags = (br, style) => word => ({s: word, br: br, style: style});
	function tagText(ctx, styleFonts, text) {
		const formats = [
			{l: '[', r: ']', style: 'bold', canBreak: false},
			{l: '*', r: '*', style: 'bold', canBreak: true},
			{l: '<b>', r: '</b>', style: 'bold', canBreak: true},
			{l: '#', r: '#', style: 'italic', canBreak: true},
			{l: '<i>', r: '</i>', style: 'italic', canBreak: true},
		];
		//const escapeRe = re => (re.length > 1)?re:`\\${re}`;
		const escapeRe = re => re.replace(/[-[\]{}()*+?.,\\\/^$|#\s]/g, '\\$&');
		formats.forEach(format => {
			const l = escapeRe(format.l);
			const r = escapeRe(format.r);
			format.reStr = `${l}((:?(?!${r}).)*)${r}`;
			format.re = new RegExp(`^${format.reStr}$`);
		});
		var reWhiteSpace = /[\s\t]+/g;
		var reSpace = /[\s]/;
		var reParts = new RegExp(`(${formats.map(({reStr})=>`(?:${reStr})`).join('|')})`, 'g');
		var reBoldTest = /(\[[^\]]+\])/;
		var reBoldToText = /^\[([^\]]+)\]$/;
		text = text.replace(reWhiteSpace, ' ');
		let textParts = [], m, start = 0;
		while ((m = reParts.exec(text)) !== null) {
			textParts.push(text.slice(start, start = m.index));
			textParts.push(text.slice(start, start += m[1].length));
		}
		textParts.push(text.slice(start, text.length));
		//textParts = text.split(reSplit).filter(s => typeof s === 'string' && s.length > 0);
		var taggedParts = [].concat.apply([], textParts
			.map(str => {
				var i = formats.length; while(i--) {
					if(formats[i].re.test(str)) {
						str = str.replace(formats[i].re, '$1');
						// Return styled part
						if(formats[i].canBreak === false) {
							return {s: str, br: false, style: formats[i].style};
						} else {
							return str.split(reSpace).map(wordsToTags(true, formats[i].style));
						}
					}
				}
				// Return unstyled parts
				return str.split(reSpace).map(wordsToTags(true, 'normal'));
			})
		);
		// Remove blank segments
		var i = taggedParts.length; while(i--) {
			var part = taggedParts[i];
			if(part.s === '') {
				if(i > 0) taggedParts[i-1].br = part.br || taggedParts[i-1].br;
				taggedParts.splice(i, 1);
			} else {
				ctx.font = styleFonts[part.style];
				part.w = ctx.measureText(part.s).width;
			}
		}
		return taggedParts;
	}
	function calculateLineMetrics(ctx, fonts, text, lineWidths) {
		//console.info('calculateLineMetrics(ctx, "%s", lineWidths);', text);
		function getLineBreak(taggedText, spaceWidth, start, maxWidth) {
			//console.info('getLineBreak(taggedText, spaceWidth, %s, %s);', start, maxWidth);
			let i, width = 0;
			for(i = start; i < taggedText.length; i++) {
				width += taggedText[i].w;
				//console.log(i, width, maxWidth, taggedText[i]);
				if(taggedText[i].br) {
					if(width > maxWidth) {
						//console.log(i, width, maxWidth, width > maxWidth);
						do {i--;} while(i > 0 && taggedText[i].br === false);
						//console.log(i);
						//console.log('return i > i=', i);
						return i;
					}
					width += spaceWidth;
				}
			}
			//console.log('return i-1 > i=', i);
			return i-1;
		}
		function getLineWidth(taggedText, spaceWidth, start, end) {
			//console.log('getLineWidth(taggedText, spaceWidth, %s, %s, %s)', start, end, taggedText.slice(start, end+1).map(getProp('s')));
			return -spaceWidth+taggedText
				.slice(start, end+1)
				.map(getProp('w'))
				.reduce(function(pv, cv) { return pv + cv + spaceWidth; }, 0);
		}
		function calculateBreaks(taggedText, spaceWidth, lineWidths) {
			const breaks = [];
			let start = 0, end = 0, lineW;
			for(let i = 0; i < lineWidths.length; i++) {
				end = getLineBreak(taggedText, spaceWidth, start, lineWidths[i]);
				lineW = getLineWidth(taggedText, spaceWidth, start, end);
				breaks.push(end);
				start = end+1;
			}
			return breaks;
		}
		const styleFonts = {
			normal: fonts.font,
			bold: fonts.fontBold,
			italic: fonts.fontItalic,
		};
		const options = [
			{ widths: [520], scaleX: 1, scaleY: 1},
			{ widths: [520, 520], scaleX: 1, scaleY: 1},
			{ widths: [520, 520, 420], scaleX: 1, scaleY: 1},
			{ widths: [510, 510, 420], scaleX: 0.9, scaleY: 0.9},
			{ widths: [510, 510, 420], scaleX: 0.78, scaleY: 0.8},
			{ widths: [510, 510, 420], scaleX: 0.78, scaleY: 0.8},
			{ widths: [510, 510, 420], scaleX: 0.75, scaleY: 0.75},
			{ widths: [510, 510, 420], scaleX: 0.70, scaleY: 0.75},
			{ widths: [510, 510, 460, 400], scaleX: 0.9, scaleY: 0.9},
			{ widths: [510, 510, 480, 400], scaleX: 0.8, scaleY: 0.8},
			{ widths: [510, 510, 480, 400], scaleX: 0.75, scaleY: 0.75},
			{ widths: [510, 510, 510, 460, 400, 100000], scaleX: 0.9, scaleY: 0.9},
		];
		const taggedText = tagText(ctx, styleFonts, text);
		const spaceWidth = ctx.measureText(' ').width;
		//console.log('text:', text);
		//console.log('taggedText:', taggedText.map(({s, br, w}) => `${s} (${br}, ${Math.round(w)})`));
		let i, breaks, solution;
		for(i = 0; i < options.length; i++) {
			//console.log('\nTry option %s:', i, options[i].widths);
			breaks = calculateBreaks(taggedText, spaceWidth, options[i].widths);
			//console.log('breaks:', breaks, breaks[breaks.length-1], taggedText.length-1);
			if(breaks[breaks.length-1] >= taggedText.length-1) {
				solution = i;
				break;
			}
		}
		//console.log('solution:', solution);
		var x = 512, y = 463, lineHeight = 60;
		var widths = options[solution].widths;
		ctx.translate(x, y);
		ctx.scale(options[solution].scaleX, options[solution].scaleY);
		ctx.translate(-x, -y);
		ctx.textAlign = 'left';
		ctx.fillStyle = 'rgba(0,0,0,1)';
		var start = 0, end = 0;
		var lineY = y - ((widths.length-1) * lineHeight) / 2;
		for(i = 0; i < widths.length; i++) {
			//ctx.strokeStyle = 'rgba(0,0,0,0.6)';
			//ctx.strokeRect(x - widths[i] / 2, lineY - lineHeight/2, widths[i], lineHeight);
			end = breaks[i];
			var spaceW = spaceWidth;
			var lineW = getLineWidth(taggedText, spaceWidth, start, end);
			var lineX = x - lineW / 2;
			//console.log('[%s,%s] "%s"', start, end, joinParts(taggedText.slice(start, end+1)));
			taggedText.slice(start, end + 1)
			.forEach(part => {
				//ctx.fillStyle = 'rgba(0,0,0,1)';
				ctx.font = styleFonts[part.style];
				ctx.fillText(part.s, lineX, lineY);
				//ctx.strokeStyle = 'rgba(255,0,0,0.8)';
				//ctx.strokeRect(lineX, lineY - lineHeight/2, part.w, lineHeight);
				lineX += part.w + (part.br?spaceW:0);
			});
			lineY += lineHeight;
			start = end + 1;
		}
	}
	function setStyle(ctx, style) {
		Object.keys(style).forEach(function(key) {
			//if(key == 'font') console.log('style[%s] \'%s\' -> \'%s\'', key, ctx[key], style[key]);
			ctx[key] = style[key];
		});
	}
	function renderMultilineText(ctx, text, x, y, style, lineHeight, lineWidths) {
		if(text === '') return;
		setStyle(ctx, style);
		calculateLineMetrics(ctx, style, text, lineWidths);
	}
	function drawDescription(ctx, description) {
		//ctx.translate(w/2, 0);
		//ctx.scale(0.95, 1);
		//ctx.translate(-w/2, 0);
		var descriptionStyle = {};
		renderMultilineText(ctx, description, 168, 334, descriptionStyle, 20, [226, 222, 190, 180, 180, 180]);
	}
	class HSCard extends CardMesh {
		constructor() {
			super();
			this.textTitle = '';
			this.textDescription = '';
		}
		loadFonts(fonts) {
			const cssFontLoader = this.entities.findComponent('CSSFontLoaderComponent');
			this.fonts = Promise.all(fonts.map(font => cssFontLoader.load(font)));
			return this.fonts;
		}
		renderCardText(canvas) {
			const {textTitle: title, textDescription: description} = this;
			const ctx = canvas.getContext('2d');
			const titleFont = {
				url: 'http://dev.xenocards.com/fonts/Belwe_Bd_BT_bold.woff',
				family: 'Belwe',
				style: 'normal',
				weight: 'bold'
			};
			const descriptionFontReg = {
				url: 'http://dev.xenocards.com/fonts/ITCFranklinGothicStd-MdCd.woff',
				family: 'FranklinGothic',
				style: 'normal',
				weight: 'normal'
			};
			const descriptionFontBold = {
				url: 'http://dev.xenocards.com/fonts/ITCFranklinGothicStd-DmCd.woff',
				family: 'FranklinGothic',
				style: 'normal',
				weight: 'bold'
			};
			return this.loadFonts([titleFont, descriptionFontReg, descriptionFontBold])
			.then(res => {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				var font;
				font = titleFont;
				ctx.fillStyle = 'white';
				//ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
				ctx.font = `${font.style} ${font.weight} 65px ${font.family}`;
				//ctx.shadowOffsetX = 0;
				//ctx.shadowOffsetY = 0;
				ctx.shadowBlur = 20;
				ctx.shadowColor = 'black';
				ctx.fillText(title, canvas.width / 2, canvas.height / 2 + -6 * 48);
				ctx.fillStyle = 'black';
				ctx.lineWidth = '3';
				ctx.strokeText(title, canvas.width / 2, canvas.height / 2 + -6 * 48);
				ctx.fillStyle = 'black';
				ctx.shadowBlur = 0;
				//font = descriptionFont;
				//ctx.font = `${font.style} ${font.weight} 48px ${font.family}`;
				//ctx.fillText('Battlecry: Discover a', canvas.width / 2, canvas.height / 2 + -1 * 48);
				//ctx.fillText('Mage, Priest, or Warlock', canvas.width / 2, canvas.height / 2 + 0 * 48);
				//ctx.fillText('card.', canvas.width / 2, canvas.height / 2 + 1 * 48);

				const descriptionStyle = {
					font: `normal 60px FranklinGothic`,
					fontBold: `bold 60px FranklinGothic`,
					fontItalic: `italic 60px FranklinGothic`,
					//font: '40px "Proxima Nova Cn Rg"',
					//fontBold: 'bold 40px "Proxima Nova Cn Rg"',
					//fontItalic: 'italic 40px "Proxima Nova Cn Rg"',
					textAlign: 'center', textBaseline: 'middle',
					lineWidth: 0, strokeStyle: 'transparent',
					fillStyle: 'black',
				};
				const lineWidths = [226, 222, 190, 180, 180, 180];
				//console.log(calculateLineMetrics(ctx, descriptionStyle, description, lineWidths));
				renderMultilineText(ctx, description, 512, 334, descriptionStyle, 100, lineWidths);

				//ctx.fillText(description, canvas.width / 2, canvas.height / 2 + 0 * 48);
				//canvasTex.magFilter = THREE.LinearMipmapLinearFilter;
				//canvasTex.minFilter = THREE.LinearMipmapLinearFilter;
				this.textTexture.needsUpdate = true;
			});
		}
		OnAttachComponent(entity) {
			//super.OnAttachComponent(entity);
			const renderer = this.entities.findComponent('Renderer');
			const textureLoader = this.entities.findComponent('TextureLoaderComponent');
			const {width, height, thickness} = this;
			//const cornerRadius = 0.2;
			//const shape = makeRoundedRectShape(0, 0, width, height, cornerRadius);
			//const geometry = new ExtrudeGeometry(shape, {amount: thickness, bevelEnabled: false, steps: 1});
			const geometry = new BoxGeometry(1, 1, 1);
			//geometry.rotateX(0.5 * Math.PI);
			//geometry.translate(0, thickness, 0);
			const canvas = document.createElement('canvas');
			this.textTexture = new THREE.Texture(canvas);
			canvas.width = 1024;
			canvas.height = 1024;
			this.textCanvas = canvas;
			//this.setTitle('Kabal Courier');
			const textures = {
				template: textureLoader.load('/hsart/mNeutral_2.jpg'),
				framesAlpha: textureLoader.load('/hsart/framesAlpha.png'),
				back: textureLoader.load('/hsart/mNeutral.jpg'),
				//back: new THREE.Texture(canvas),
				//back: textureLoader.load('/images/testuv.jpg'),
				//portrait: textureLoader.load('/hsart/OG_024.jpg'),
				portrait: textureLoader.load('/hsart/CFM_649.jpg'),
				gem: textureLoader.load('/hsart/gem.png'),
				att: textureLoader.load('/hsart/attack.png'),
				hp: textureLoader.load('/hsart/health.png'),
				title: textureLoader.load('/hsart/title.png'),
				rarity: undefined,
				//rarity: textureLoader.load('/hsart/rarity-rare.png'),
				//portrait: textureLoader.load('/images/testuv.jpg'),
				//portrait: canvasTex,
				//portrait: textureLoader.load('/images/uv_checker.png'),
				text: this.textTexture,
			};
			/*
			Object.keys(textures).forEach(name => {
				const texture = textures[name];
				//texture.magFilter = THREE.LinearMipmapLinearFilter;
				//texture.minFilter = THREE.LinearMipmapLinearFilter;
			});
			*/
			const uniforms = {
				templateTex: {type: 't', value: textures.template},
				alphaTex: {type: 't', value: textures.framesAlpha},
				textTex: {type: 't', value: textures.text},
				dims: {type: 'v2', value: new Vector2(764, 1100)},
				alpha: {type: 'f', value: 0.5},
			};
			const overlays = [
				{name: 'back', dims: {x: 764, y: 1100}, pos: {x: 0, y: 0}},
				{name: 'portrait', dims: {x: 585, y: 585}, pos: {x: 103, y: 79}},
				{name: 'rarity', dims: {x: 146, y: 146}, pos: {x: 327, y: 608}},
				{name: 'title', dims: {x: 618, y: 154}, pos: {x: 88, y: 543}},
				{name: 'gem', dims: {x: 184, y: 182}, pos: {x: 23, y: 82}},
				{name: 'att', dims: {x: 214, y: 238}, pos: {x: -2, y: 864}},
				{name: 'hp', dims: {x: 167, y: 218}, pos: {x: 586, y: 883}},
				{name: 'text', dims: {x: 1024, y: 1024}, pos: {x: -0.5 * (1024-764), y: 400}},
			];
			overlays.forEach(({name, dims, pos}) => {
				uniforms[name+'Tex'] = {type: 't', value: textures[name]};
				uniforms[name+'Dims'] = {type: 'v2', value: dims};
				uniforms[name+'Pos'] = {type: 'v2', value: pos};
			});
			/*
				back: 764 x 1100
				portrait: 512 x 512
				ratio; 1.28125 x 2.1484375
				padding-left: 72/764
				205/160 = 1.28125
				290/160 = 1.8125
				body 192x136
				face 106x106
				205x290
				160x161
				x: 22.656, 22.672
				y: 17.391, 111.138
				22.656 + 22.672 + 160 = 205.328
				17.391 + 111.138 + 161 = 289.529
				ratio 3.2
				764x1100
				body: 656x928
				portrait: 512x512
				padding-x: 72.4992, 72.5504
				padding-y: 55.6512, 355.6416
				padding-left: 72
				padding-right: 72
				padding-top: 55.65
				padding-bottom: 355.6
				ratio: 1.18534482759 / 1.16463414634: 1.185
			*/
			const material_shh = new THREE.ShaderMaterial({
				transparent: true,
				depthWrite: false,
				depthTest: false,
				side: THREE.FrontSide,
				uniforms: uniforms,
				vertexShader: shaders.vertHSCard,
				fragmentShader: shaders.fragHSCard,
			});
			document.body.addEventListener('keypress', event => {
				const {rarityPos: pos, rarityDims: dims, alpha} = material_shh.uniforms;
				switch(event.key) {
					case '+':
						dims.value.x += 1;
						dims.value.y += 1;
						break;
					case '-':
						dims.value.x += -1;
						dims.value.y += -1;
						break;
					case 'w': pos.value.y += -1; break;
					case 'a': pos.value.x += -1; break;
					case 's': pos.value.y +=  1; break;
					case 'd': pos.value.x +=  1; break;
					case ' ': alpha.value = (alpha.value < 1)?1: 0.0; break;
				}
				console.log('p: %s / %s d: %s / %s a: %s',
					pos.value.x,  pos.value.y,
					dims.value.x,  dims.value.y,
					alpha.value
				);
			});
			Mesh.call(this, geometry, material_shh);
			super.OnAttachComponent(entity);
			normalizeUVs(this.geometry,
				new Vector2(-0.5,-0.5),
				new Vector2( 0.5, 0.5),
				new Vector2(0, 0)
			);
			this.geometry.rotateX(-0.5 * Math.PI);
			this.geometry.scale(width, thickness, height);
			geometry.translate(0, thickness, 0);
			entity.collider.material.visible = false;
		}
		setPortrait(url) {
			//console.info('setPortrait("%s")', url);
			const textureLoader = this.entities.findComponent('TextureLoaderComponent');
			this.material.uniforms.portraitTex.value = textureLoader.load(url);
		}
		setText({title = this.textTitle, description = this.textDescription}) {
			//console.info('setText({title, description})', title, description);
			this.textTitle = title;
			this.textDescription = description
				.replace(/^\[x\]/, '')
				.replace(/\{[0-9]\}/igm, '1')
				;
			return this.renderCardText(this.textCanvas);
		}
		setTitle(title) {
			//console.info('setTitle("%s")', title);
			this.textTitle = title;
			return this.renderCardText(this.textCanvas);
		}
		setDescription(description) {
			//console.info('setDescription("%s")', description);
			this.textDescription = description;
			return this.renderCardText(this.textCanvas);
		}
		setRarity(rarity) {
			//console.info('setRarity("%s")', rarity);
			const textureLoader = this.entities.findComponent('TextureLoaderComponent');
			const rarityUrls = {
				COMMON: 'hsart/rarity-common.png',
				EPIC: 'hsart/rarity-epic.png',
				LEGENDARY: 'hsart/rarity-legendary.png',
				RARE: 'hsart/rarity-rare.png',
			};
			this.material.uniforms.rarityTex.value = rarityUrls[rarity]?textureLoader.load(rarityUrls[rarity]):undefined;
		}
	}


class CardAnimator {
	OnAttachComponent(entity) {
		//console.info('Animator.OnAttachComponent(entity);');
		this.directions = [
			new Vector3(0, 0, -1), // up
			new Vector3(1, 0, 0), // right
			new Vector3(0, 0, 1), // down
			new Vector3(-1, 0, 0), // left
		];
	}
	getTranslation(animation) {
		//const cardMesh = this.entity.getComponent(CardMesh);
		const {entity, entities, directions} = this;
		const transform = entity.getComponent(Transform);
		const cardMesh = entity.getComponent(CardMesh);
		const cardSize = new Vector3(cardMesh.width, 0, cardMesh.height);
		const cards = entities.queryComponents([Card]);
		const translation = new Vector3();
		switch(animation) {
			case 0: translation.set(2, 0, 0); break;
			case 1: translation.set(-2, 0, 0); break;
			case 2:
				var dirs = directions.filter(dir =>
					cards.find(({transform: {position}}) =>
						transform.position.clone()
							.add(dir.clone().multiply(cardSize))
							.distanceTo(position) < 1
					) === undefined
				);
				if(dirs.length > 0) {
					var dir = Math.floor(Math.random()*dirs.length);
					translation.copy(dirs[dir]);
				}
				break;
		}
		return {translation};
	}
	getRotation({translation}) {
		const transform = this.entity.getComponent(Transform);
		const start = transform.rotation.clone();
		start.x = Math.abs(start.x) % (2 * Math.PI);
		start.y = Math.abs(start.y) % (2 * Math.PI);
		start.z = Math.abs(start.z) % (2 * Math.PI);
		const end = start.clone();
		const horizontal = Math.abs(translation.x) > Math.abs(translation.z);
		if(horizontal) {
			const landRightSideUp = Math.abs(start.x) % (2 * Math.PI) <= Number.EPSILON;
			const moveLeft = translation.x <= Number.EPSILON;
			const flipLeft = moveLeft == landRightSideUp;
			end.z += (flipLeft?1:-1) * Math.PI;
		} else {
			const flipUp = translation.z <= Number.EPSILON;
			end.x += (flipUp?-1:1) * Math.PI;
		}
		return {start, end};
	}
	getCurve(from, to, height = 1) {
		const points = [
			from,
			from.clone().add(new Vector3(0, height, 0))
				.addScaledVector(to.clone().sub(from), 0.25),
			to.clone().add(new Vector3(0, height, 0))
				.addScaledVector(to.clone().sub(from), -0.25),
			to
		];
		const curve = new CatmullRomCurve3(points);
		return curve;
	}
	getCurveLine(curve) {
		const material = new LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.2});
		const geometry = new Geometry();
		geometry.vertices = curve.getSpacedPoints(20);
		const line = new Line(geometry, material);
		return line;
	}
	animate(animation) {
		//console.info('Animator.animate(animation);');
		const transform = this.entity.getComponent(Transform);
		const cardMesh = this.entity.getComponent(CardMesh);
		const props = {t: 0};
		const {translation} = this.getTranslation(animation);
		const {start, end} =  this.getRotation({translation});
		const horizontal = Math.abs(translation.x) > Math.abs(translation.z);
		const curveHeight = (horizontal?cardMesh.width:cardMesh.height) * 0.5;
		const startY = transform.position.y;
		const rot = new Vector3();
		translation.multiplyScalar(curveHeight * 2);
		const curve = this.getCurve(
			transform.position.clone(),
			transform.position.clone().add(translation),
			curveHeight
		);
		const line = this.getCurveLine(curve);
		transform.parent.add(line);
		TweenMax.to(props, 0.2, {
			t: 1,
			ease: SlowMo.ease.config(0.0, 0.5, false),
			onUpdate: () => {
				transform.position.copy(curve.getPointAt(props.t));
				rot.lerpVectors(start, end, props.t);
				transform.rotation.z = rot.z;
				transform.rotation.x = rot.x;
				line.material.opacity = 0.2 + (transform.position.y - startY) / curveHeight * 0.5;
			},
			onComplete: () => {
				TweenMax.to(line.material, 0.5, {
					opacity: 0,
					onComplete: () => line.parent.remove(line)
				});
			}
		});
	}
	slideTo(targetPos, targetRot, onComplete) {
		//console.info('CardAnimator.slideTo(targetPos, targetRot, onComplete);');
		const transform = this.entity.getComponent(Transform);
		const props = {t: 0};
		const startPos = transform.position.clone();
		const startRot = transform.rotation.clone();
		const pos = new Vector3();
		const rot = new Euler();
		return TweenMax.to(props, 0.2, {
			t: 1,
			ease: Power2.easeInOut,
			onUpdate: () => {
				pos.lerpVectors(startPos, targetPos, props.t);
				transform.position.copy(pos);
				transform.rotation.x = (targetRot.x - startRot.x) * props.t + startRot.x;
				transform.rotation.y = (targetRot.y - startRot.y) * props.t + startRot.y;
				transform.rotation.z = (targetRot.z - startRot.z) * props.t + startRot.z;
			},
			onComplete
		});
	}
}


if(typeof module !== 'undefined' && ('exports' in module)){
	module.exports = {
		getRandomColor,
		CardData,
		Card,
		CardMesh,
		RoundedCornersCard,
		BallCard,
		XACard,
		HSCard,
		CardAnimator,
	};
	module.exports.ecsCards = module.exports;
}
})();