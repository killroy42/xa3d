(function(){
'use strict';
//var gm = require('gm');

var Promise = (function() {
	if(typeof window !== 'undefined' && typeof window.Promise !== 'undefined') {
		return window.Promise;
	} else if(typeof require === 'function') {
		return require('bluebird');
	}
	throw new Error('Unable to find Promise implementation.');
})();


function CardRenderer(opts) {
	this.opts = opts;
	this.createCanvas = opts.createCanvas;
	this.createImage = opts.createImage;
	this.encodeBase64 = opts.encodeBase64; // btoa(unescape(encodeURIComponent(svg)));
	this.cardWidth = 336;
	this.cardHeight = 460;
	this.cardTemplates = [];
	this.atlas = {parts: {}, images: {}};
}
	
CardRenderer.v = '0.0.1';
	
CardRenderer.unitcardTransform = {
	left: 40, top: -11,
	width: 256, height: 350
};

CardRenderer.prototype.drawCardFront = function(canvas, template, isUnit) {
	//console.info('CardRenderer.drawCardFront(canvas, template, isUnit)');
	var w = this.cardWidth;
	var h = this.cardHeight;
	var ctx = canvas.getContext('2d');
	/*
	this.applyCss(canvas, {
		position: 'absolute', left: 0, right: 0,
		backfaceVisibility: 'hidden'
	});
	*/
	if(template.type == 'action') { // action card
		this.drawAtlasPart(ctx, 'actioncard', 0, 0);
		this.drawAtlasPart(ctx, template.portrait, 0, 0, 336, 230);
		this.drawAtlasPart(ctx, 'cost', 8, 9, 80, 80);
	} else if(isUnit) { // unit
		this.drawAtlasPart(ctx, 'unit', 0, 0);
		this.drawAtlasPart(ctx, template.portrait, 0, 0);
		this.drawAtlasPart(ctx, 'att', 8, 360, 80, 80);
		this.drawAtlasPart(ctx, 'hp', 248, 360, 80, 80);
	} else { // unit card
		this.drawAtlasPart(ctx, 'unitcard', 0, 0);
		var trans = CardRenderer.unitcardTransform;
		this.drawAtlasPart(ctx, template.portrait, trans.left, trans.top, trans.width, trans.height);
		this.drawAtlasPart(ctx, 'cost', 8, 9, 80, 80);
		this.drawAtlasPart(ctx, 'att', 8, 370, 80, 80);
		this.drawAtlasPart(ctx, 'hp', 248, 370, 80, 80);
	}
	return this;
};

CardRenderer.prototype.drawAtlasPart = function(ctx, partName, x, y, w, h) {
	//console.error('drawAtlasPart(ctx, "%s", %s, %s);', partName, x, y, w || this.cardWidth, h || this.cardWidth);
	var part = this.atlas.parts[partName];
	if(part === undefined) {
		throw new Error('Invalid atlas part: "'+partName+'"');
	}
	var img = this.atlas.images[part.atlas];
	if(img === undefined) {
		throw new Error('Invalid atlas image: "'+part.atlas+'"');
	}
	if(w === undefined) w = this.cardWidth;
	if(h === undefined) h = this.cardHeight;
	ctx.drawImage(img, part.x, part.y, part.w, part.h, x, y, w, h);
};

CardRenderer.prototype.drawCardText = function(cardCanvas, template, isUnit) {
	//console.info('drawCardText(%s, %s, %s);', cardCanvas, template, isUnit);
	var self = this;
	var w = this.cardWidth;
	var h = this.cardHeight;
	function setStyle(ctx, style) {
		Object.keys(style).forEach(function(key) {
			//if(key == 'font') console.log('style[%s] \'%s\' -> \'%s\'', key, ctx[key], style[key]);
			ctx[key] = style[key];
		});
	}
	function renderText(ctx, text, x, y, style) {
		//console.info('renderText(ctx, "%s", %s, %s, style);', text, x, y)
		ctx.save();
		//console.log(ctx.font);
		x = Math.round(x);
		y = Math.round(y);
		setStyle(ctx, style);
		//console.log('  Font:', ctx.font);
		if(style.maxWidth !== undefined) {
			var measure = ctx.measureText(text);
			var textWidth = measure.width;
			if(textWidth > style.maxWidth) {
				var scale = style.maxWidth / textWidth;
				ctx.translate(w/2, 0);
				ctx.scale(scale, 1);
				ctx.translate(-w/2, 0);
				//console.log('  scale:', scale);
			}
			//console.log('  textWidth:', textWidth);
			//console.log('  bounds:', Math.floor(measure.actualBoundingBoxLeft) + Math.floor(measure.actualBoundingBoxRight));
		}
		//console.log('  maxWidth:', style.maxWidth);
		//console.log('measure:', measure);

		if(style.textShadow) {
			style.textShadow.split(',').forEach(function(shadow) {
				var parts = shadow.trim().split(' ');
				ctx.shadowOffsetX = parseFloat(parts[0]);
				ctx.shadowOffsetY = parseFloat(parts[1]);
				ctx.shadowBlur = parseFloat(parts[2]);
				ctx.shadowColor = parts[3];
				ctx.fillText(text, x, y);
			});
		}
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.shadowBlur = 0;
		ctx.shadowColor = 'transparent';
		ctx.strokeText(text, x, y);
		ctx.fillText(text, x, y);
		ctx.restore();
	}
	function getLine(ctx, text, startWord, maxWidth) {
		var words = text.replace(/[\s\t]+/g, ' ').replace(/([\s])/g, '|').split('|');
		var endWord = startWord;
		do {
			endWord++;
			var line = words.slice(startWord, endWord).join(' ');
			var measure = ctx.measureText(line);
			var lineWidth = measure.width;
		} while(endWord < words.length && lineWidth < maxWidth);
		if(lineWidth > maxWidth) endWord--;
		return endWord;
	}
	function calculatePartsWidth(ctx, fonts, lineParts) {
		var width = 0;
		var i = lineParts.length; while(i--) {
			if(lineParts[i].b === true) {
				ctx.font = fonts.fontBold;
			} else {
				ctx.font = fonts.font;
			}
			width += ctx.measureText(lineParts[i].s).width;
		}
		return width;
	}
	function calculateLineError(width, targetWidth) {
		var error = Math.abs(targetWidth - width);
		return error;// * error;
	}
	function getPermutations(input) {
		var results = [];
		function permute(arr, memo) {
			var cur, memo = memo || [];
			for (var i = 0; i < arr.length; i++) {
				cur = arr.splice(i, 1);
				if (arr.length === 0) {
					results.push(memo.concat(cur));
				}
				permute(arr.slice(), memo.concat(cur));
				arr.splice(i, 0, cur[0]);
			}
			return results;
		}
		return permute(input);
	}
	function addBreak(breakAt) {
		return function(breaks) {
			breaks.push(breakAt)
			return breaks;
		};
	}
	function getBreakPermutations(numParts, numBreaks) {
		//console.info('getBreakPermutations(%s, %s);', numParts, numBreaks);
		var permutations = [];
		if(numParts === 1 || numBreaks === 0) {
		} else if(numBreaks === 1) {
			var i = numParts-1; while(i--) {
				permutations.push([i]);
			}
		} else {
			var i = numParts-1; while(i--) {
				var breaks = getBreakPermutations(i+1, numBreaks-1).map(addBreak(i));
				permutations = permutations.concat(breaks);
			}
		}
		//console.info('getBreakPermutations(%s, %s) = %s', numParts, numBreaks, JSON.stringify(permutations));
		return permutations;
	}
	function getProp(prop) {
		return function(item) {
			return item[prop];
		};
	}
	function joinParts(parts) {
		return parts
			.reduce(function(s, cur, idx, arr) {
				var br = arr[idx-1] && arr[idx-1].br;
				return s+(br?' ':'')+cur.s;
			}, '');
	}
	function textToWords(text) {
		return text.replace(/([\s])/g, '|').split('|');
	}
	function wordsToTags(br, style) {
		return function(word) {
			return {s: word, br: br, style: style}
		};
	}
	function tagText(ctx, styleFonts, text) {
		var formats = [
			{l: '[', r: ']', style: 'bold', canBreak: false},
			{l: '*', r: '*', style: 'bold', canBreak: true},
			{l: '#', r: '#', style: 'italic', canBreak: true}
		];
		formats.forEach(function(format) {
			var l = format.l;
			var r = format.r;
			format.reTest = new RegExp('^\\'+l+'[^\\'+r+']*\\'+r+'$');
			format.reReplace = new RegExp('^\\'+l+'([^\\'+r+']*)\\'+r+'$');
			format.reStr = '\\'+l+'[^\\'+r+']+\\'+r;
		});
		var reWhiteSpace = /[\s\t]+/g;
		var reSpace = /[\s]/;
		var reSplit = new RegExp('('+
			formats.map(function(format) {return '(?:'+format.reStr+')';}).join('|')+
		')', 'g');
		var reBoldTest = /(\[[^\]]+\])/;
		var reBoldToText = /^\[([^\]]+)\]$/;
		text = text.replace(reWhiteSpace, ' ');
		var taggedParts = [].concat.apply([],
			text.split(reSplit).map(function(str) {
				var i = formats.length; while(i--) {
					if(formats[i].reTest.test(str)) {
						str = str.replace(formats[i].reReplace, '$1');
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

		var styleFonts = {
			normal: fonts.font,
			bold: fonts.fontBold,
			italic: fonts.fontItalic,
		};
		var taggedText = tagText(ctx, styleFonts, text);
		var spaceWidth = ctx.measureText(' ').width;
		//console.dir(text);
		//console.dir(taggedText);

		function getLineWidth(start, end, spaceWidth) {
			//console.log('getLineWidth(%s, %s)', start, end, taggedText.slice(start, end+1).map(getProp('s')));
			return -spaceWidth+taggedText
				.slice(start, end+1)
				.map(getProp('w'))
				.reduce(function(pv, cv) { return pv + cv + spaceWidth; }, 0);
		}
		function getLineBreak(start, maxWidth) {
			var width = 0;
			for(var i = start; i < taggedText.length; i++) {
				width += taggedText[i].w;
				if(taggedText[i].br) {
					if(width > maxWidth) {
						do {i--;} while(i > 0 && taggedText[i].br === false);
						return i;
					}
					width += spaceWidth
				}
			}
			return i-1;
		}
		function calculateBreaks(lineWidths) {
			var breaks = [];
			var start = 0, end = 0, lineW;
			for(var i = 0; i < lineWidths.length; i++) {
				end = getLineBreak(start, lineWidths[i]);
				lineW = getLineWidth(start, end, spaceWidth);
				/*
					console.log('  line %s [%s to %s]: (%spx/%spx) "%s"', i, start, end,
						lineW, lineWidths[i],
						joinParts(taggedText.slice(start, end+1))
					);
				*/
				breaks.push(end);
				start = end+1;
			}
			return breaks;
		}
		var options = [
			{ widths: [180], scaleX: 1, scaleY: 1},
			{ widths: [180, 150], scaleX: 1, scaleY: 1},
			{ widths: [200, 180], scaleX: 1, scaleY: 1},
			{ widths: [200, 180, 140], scaleX: 1, scaleY: 1},
			{ widths: [210, 200, 170], scaleX: 0.98, scaleY: 1},
			{ widths: [190, 180, 150, 150], scaleX: 1, scaleY: 1},
			{ widths: [210, 200, 170, 160], scaleX: 1, scaleY: 1},
			{ widths: [200, 190, 190, 160], scaleX: 1, scaleY: 1},
			{ widths: [220, 200, 190, 160], scaleX: 1, scaleY: 1},
			{ widths: [200, 190, 190, 160, 160], scaleX: 1, scaleY: 1},
			{ widths: [210, 200, 190, 160, 160], scaleX: 1, scaleY: 1},
			{ widths: [250, 240, 220, 194, 190], scaleX: 0.87, scaleY: 0.9},
			{ widths: [270, 260], scaleX: 0.75, scaleY: 0.9},
			{ widths: [200, 200, 200, 200, 200, 200, 100000], scaleX: 1, scaleY: 1}
		];
		var breaks, solution;
		for(var i = 0; i < options.length; i++) {
			//console.log('\nTry option %s:', i, options[i]);
			var breaks = calculateBreaks(options[i].widths);
			if(breaks[breaks.length-1] >= taggedText.length-1) {
				solution = i;
				break;
			}
		}
		/*
			console.log('Solution:', options[solution], breaks);
			breaks.reduce(function(start, end, idx, arr) {
				console.log('  ', joinParts(taggedText.slice(start, end+1)));
				return end+1;
			}, 0);
		*/

		var x = 168, y = 364, lineHeight = 20;
		var widths = options[solution].widths;

		ctx.translate(x, y);
		ctx.scale(options[solution].scaleX, options[solution].scaleY);
		ctx.translate(-x, -y);

		ctx.textAlign = 'left';
		ctx.fillStyle = 'rgba(0,0,0,1)';

		var start = 0, end = 0;
		var lineY = y - ((widths.length-1) * lineHeight) / 2;
		for(var i = 0; i < widths.length; i++) {
			//ctx.fillStyle = 'rgba(0,255,0,0.1)';
			//ctx.fillRect(x - widths[i] / 2, lineY - lineHeight/2, widths[i], lineHeight);

			end = breaks[i];
			var spaceW = spaceWidth;
			var lineW = getLineWidth(start, end, spaceWidth);
			var lineX = x - lineW / 2;

			//console.log('[%s,%s] "%s"', start, end, joinParts(taggedText.slice(start, end+1)));

			taggedText.slice(start, end + 1).forEach(function(part) {
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
	function renderMultilineText(ctx, text, x, y, style, lineHeight, lineWidths) {
		if(text === '') return;
		setStyle(ctx, style);
		//console.time('LineMetrics');
		calculateLineMetrics(ctx, style, text, lineWidths);
		//console.timeEnd('LineMetrics');

		return;
		var reBoldSplit = /(\[[^\]]+\])/;
		var reBoldTest = /(\[[^\]]+\])/;
		var reBoldToText = /^(?:\[([^\]]+)\]|(.+)|)$/;
		var words = text.replace(/[\s\t]+/g, ' ').replace(/([\s])/g, '|').split('|');
		var start = 0;
		var end = 0;
		var currentLine = 0;
		var width;
		end = 0;
		do {
			width = Array.isArray(lineWidths)?lineWidths[currentLine]:lineWidths;
			start = end;
			end = getLine(ctx, text, start, width);
			var sections = words.slice(start, end).join(' ').split(reBoldSplit).map(function(str) {
				var isBold = reBoldTest.test(str);
				str = str.replace(reBoldToText, '$1$2');
				if(isBold) {
					ctx.font = style.fontBold;
				} else {
					ctx.font = style.font;
				}
				return {str: str, bold: isBold, width: ctx.measureText(str).width};
			});
			var thisLineWidth = sections.reduce(function(sum, section) {return sum+section.width;}, 0);
			var x = 168 - thisLineWidth/2;
			sections.forEach(function(part) {
				console.dir(part);
				var partStyle = {textAlign: 'left', font: styleFonts[part.style]};
				renderText(ctx, part.str, x, y, sectionStyle);
				x += section.width;
			});
			y += lineHeight;
			currentLine++;
		} while (end < words.length);
	}
	function drawTitle(ctx, title) {
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = '#9d8275';
		ctx.fillStyle = 'rgba(0,0,0,0.65)';
		ctx.fillRect(33, 226, 270, 40);
		ctx.strokeRect(33, 226, 270, 40);
		ctx.lineWidth = 1;
		renderText(ctx, title, 168, 246, titleStyle);
	}
	function drawDescription(ctx, description) {
		//ctx.translate(w/2, 0);
		//ctx.scale(0.95, 1);
		//ctx.translate(-w/2, 0);
		renderMultilineText(ctx, description, 168, 334, descriptionStyle, 20, [226, 222, 190, 180, 180, 180]);
	}
	var statStyle = {
		font: 'bold 60px "Proxima Nova Rg"',
		textAlign: 'center', textBaseline: 'middle',
		lineWidth: 4, strokeStyle: 'black',
		fillStyle: 'white',
		maxWidth: 120
	};
	var titleStyle = {
		font: '32px "Proxima Nova Cn Rg"',
		textAlign: 'center', textBaseline: 'middle',
		lineWidth: 4, strokeStyle: 'black',
		fillStyle: 'white',
		maxWidth: 250
	};
	var descriptionStyle = {
		font: '21px "Proxima Nova Cn Rg"',
		fontBold: 'bold 21px "Proxima Nova Cn Rg"',
		fontItalic: 'italic 21px "Proxima Nova Cn Rg"',
		textAlign: 'center', textBaseline: 'middle',
		lineWidth: 0, strokeStyle: 'transparent',
		fillStyle: 'black',
	};
	return new Promise(function(resolve, reject) {
		var aaLevel = 1;
		var canvas = self.createCanvas(w*aaLevel, h*aaLevel);
		var ctx = canvas.getContext('2d');
		ctx.scale(aaLevel, aaLevel);
		if(template.type === 'action') {
			if(template.cost !== undefined) renderText(ctx, template.cost, 48, 49, statStyle);
			drawTitle(ctx, template.name);
			drawDescription(ctx, template.text);
		} else if(isUnit) {
			if(template.att !== undefined) renderText(ctx, template.att, 48, 400, statStyle);
			if(template.hp !== undefined) renderText(ctx, template.hp, 288, 400, statStyle);
		} else {
			if(template.cost !== undefined) renderText(ctx, template.cost, 48, 49, statStyle);
			if(template.att !== undefined) renderText(ctx, template.att, 48, 412, statStyle);
			if(template.hp !== undefined) renderText(ctx, template.hp, 288, 412, statStyle);
			drawTitle(ctx, template.name);
			if(template.text && template.text.length > 0) {
				drawDescription(ctx, template.text);
			}
		}

		var cardCtx = cardCanvas.getContext('2d');
		cardCtx.drawImage(canvas, 0, 0, w, h);
		resolve();
		
		/*
			var cardCtx = cardCanvas.getContext('2d');
			//cardCtx.drawImage(canvas, 0, 0, w*4, h*4, -350, -1200, w*4, h*4);
			//cardCtx.antialias = 'subpixel';
			cardCtx.antialias = 'gray';
			cardCtx.imageSmoothingEnabled = true;
			cardCtx.patternQuality = 'best';
			cardCtx.filter = 'best';
			cardCtx.drawImage(canvas, 0, 0, w, h);
			resolve();
		*/
		//var dstCanvas = self.createCanvas(w, h);
		//console.log(canvas.toBuffer());
		/*
			console.time('resize');
			if(aaLevel === 1) {
				var cardCtx = cardCanvas.getContext('2d');
				cardCtx.drawImage(canvas, 0, 0, w, h);
				console.timeEnd('resize');
				resolve();
			} else {
				gm(canvas.toBuffer(), 'image.jpg')
				.resize(w, h)
				.toBuffer('PNG',function (err, buffer) {
					//console.log(err);
					//console.log(buffer);
					var img = self.createImage(w, h);
					img.src = buffer;
					//console.log(img.width, img.height);
					var cardCtx = cardCanvas.getContext('2d');
					cardCtx.drawImage(img, 0, 0, w, h);
					console.timeEnd('resize');
					resolve();
				});
			}
		*/
		/*
			var tn = new Thumbnailer(canvas, dstCanvas, w, 3).then(function(canvas) {
				console.log('Thumbnailer DONE!');
				var cardCtx = cardCanvas.getContext('2d');
				cardCtx.drawImage(canvas, 0, 0, w, h);
				resolve();
			});
		*/
	});
};

// returns a function that calculates lanczos weight
function lanczosCreate(lobes) {
	return function(x) {
		if (x > lobes)
			return 0;
		x *= Math.PI;
		if (Math.abs(x) < 1e-16)
			return 1;
		var xx = x / lobes;
		return Math.sin(x) * Math.sin(xx) / x / xx;
	};
}
// elem: canvas element, img: image element, sx: scaled width, lobes: kernel radius
function Thumbnailer(srcCanvas, dstCanvas, sx, lobes) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.srcCanvas = srcCanvas;
		self.dstCanvas = dstCanvas;
		self.srcCtx = self.srcCanvas.getContext('2d');
		self.src = self.srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
		self.dest = {
			width : sx,
			height : Math.round(srcCanvas.height * sx / srcCanvas.width),
		};
		self.dest.data = new Array(self.dest.width * self.dest.height * 4);
		self.lanczos = lanczosCreate(lobes);
		self.ratio = srcCanvas.width / sx;
		self.rcp_ratio = 2 / self.ratio;
		self.range2 = Math.ceil(self.ratio * lobes / 2);
		self.cacheLanc = {};
		self.center = {};
		self.icenter = {};
		setTimeout(self.processColumn, 0, self, 0, resolve, reject);
	});
}
Thumbnailer.prototype.processColumn = function(self, u, resolve, reject) {
	var weight;
	self.center.x = (u + 0.5) * self.ratio;
	self.icenter.x = Math.floor(self.center.x);
	for (var v = 0; v < self.dest.height; v++) {
		self.center.y = (v + 0.5) * self.ratio;
		self.icenter.y = Math.floor(self.center.y);
		var a, r, g, b, alph;
		a = r = g = b = alph = 0;
		for (var i = self.icenter.x - self.range2; i <= self.icenter.x + self.range2; i++) {
			if (i < 0 || i >= self.src.width)
				continue;
			var f_x = Math.floor(1000 * Math.abs(i - self.center.x));
			if (!self.cacheLanc[f_x])
				self.cacheLanc[f_x] = {};
			for (var j = self.icenter.y - self.range2; j <= self.icenter.y + self.range2; j++) {
				if (j < 0 || j >= self.src.height)
					continue;
				var f_y = Math.floor(1000 * Math.abs(j - self.center.y));
				if (self.cacheLanc[f_x][f_y] == undefined)
					self.cacheLanc[f_x][f_y] = self.lanczos(Math.sqrt(Math.pow(f_x * self.rcp_ratio, 2)
						+ Math.pow(f_y * self.rcp_ratio, 2)) / 1000);
				weight = self.cacheLanc[f_x][f_y];
				if (weight > 0) {
					var idx = (j * self.src.width + i) * 4;
					a += weight;
					r += weight * self.src.data[idx];
					g += weight * self.src.data[idx + 1];
					b += weight * self.src.data[idx + 2];
					alph += weight * self.src.data[idx + 3];
				}
			}
		}
		var idx = (v * self.dest.width + u) * 4;
		self.dest.data[idx] = r / a;
		self.dest.data[idx + 1] = g / a;
		self.dest.data[idx + 2] = b / a;
		self.dest.data[idx + 3] = alph / a;
	}
	if (++u < self.dest.width) {
		setTimeout(self.processColumn, 0, self, u, resolve, reject);
	} else {
		setTimeout(self.complete, 0, self, resolve, reject);
	}
};
Thumbnailer.prototype.complete = function(self, resolve, reject) {
	var dstCtx = self.dstCanvas.getContext('2d');
	var srcImageData = dstCtx.getImageData(0, 0, self.dest.width, self.dest.height);
	var srcData = srcImageData.data;
	var dstData = self.dest.data;
	var w = self.dest.width;
	var h = self.dest.height;
	var idx, idx2;
	for (var x = 0; x < w; x++) {
		for (var y = 0; y < h; y++) {
			idx = (y * w + x) * 4;
			idx2 = (y * w + x) * 4;
			srcData[idx2 + 0] = dstData[idx + 0];
			srcData[idx2 + 1] = dstData[idx + 1];
			srcData[idx2 + 2] = dstData[idx + 2];
			srcData[idx2 + 3] = dstData[idx + 3];
		}
	}
	dstCtx.putImageData(srcImageData, 0, 0);
	resolve(self.dstCanvas);
};

CardRenderer.prototype.formatDescription = function(description) {
	description = description || '';
	if(description.length === 0) {
		return '';
	}
	return description
		.replace(/\[([^\]]+)\]\{([^\}]+)\}/g, '<strong>$1</strong>$2')
		.replace(/\[([^\]]+)\]/g, '<strong>$1</strong>')
		.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>')
		.replace(/(Rapid)-(fire)/gi, '$1&#8209;$2');
};

CardRenderer.prototype.loadAtlasResource = function(atlasJsonUrl) {
	var self = this;
	var atlasNames = [];
	this.atlas = {
		parts: {},
		images: {}
	};
	console.time('Load atlas json');
	return CardRenderer.loadJsonResource(atlasJsonUrl).then(function(atlasParts) {
		console.timeEnd('Load atlas json');
		self.atlas.parts = atlasParts;
		Object.keys(atlasParts).forEach(function(name) {
			var atlasName = atlasParts[name].atlas;
			if(atlasNames.indexOf(atlasName) === -1) {
				atlasNames.push(atlasName);
			}
		});
		return atlasNames.map(function(imageName) {return self.opts.resources[imageName].url;});
	}).then(function(urls) {
		console.time('Load atlas images');
		return promisePar(urls, CardRenderer.loadImageResource)
		.then(function(images){
			console.timeEnd('Load atlas images');
			return images;
		});
	}).then(function(images) {
		images.forEach(function(img, idx) {
			self.atlas.images[atlasNames[idx]] = img;
		});
	}).then(function(images) {
		return self.atlasApplyAlpha();
	});
};

CardRenderer.prototype.atlasApplyAlpha = function() {
	var self = this;
	return new Promise(function(resolve, reject) {
		var parts = self.atlas.parts;
		// Group by atlas
		var alphaParts = {};
		Object.keys(parts).forEach(function(partName) {
			var part = parts[partName];
			alphaParts[part.atlas] = alphaParts[part.atlas] || [];
			if(part.alpha !== undefined) {
				alphaParts[part.atlas].push(part);
			}
		});
		Object.keys(alphaParts).forEach(function(atlasName) {
			var atlasImg = self.atlas.images[atlasName];
			var canvas = self.createCanvas(atlasImg.width, atlasImg.height);
			var ctx = canvas.getContext('2d');
			ctx.drawImage(atlasImg, 0, 0);
			ctx.globalCompositeOperation = 'destination-out';
			alphaParts[atlasName].forEach(function(partWithAlpha) {
				var dx = partWithAlpha.x;
				var dy = partWithAlpha.y;
				var dw = partWithAlpha.w;
				var dh = partWithAlpha.h;
				self.drawAtlasPart(ctx, partWithAlpha.alpha, dx, dy, dw, dh);
			});
			self.atlas.images[atlasName] = canvas;
		});
		resolve(self);
	});
};

CardRenderer.prototype.loadResources = function() {
	var self = this;
	return Promise.all(this.opts.resources.map(function(res) {
		var resourceReady = false;
		switch(res.type) {
			case 'image': return self.loadImageResource(res.url);
			case 'font': return self.loadFontResource(res);
			default: return Promise.reject('Unkown resource type:'+res.type);
		}
	})).then(function(){
		return self;
	});
};

CardRenderer.prototype.getTemplate = function(id) {
	var template;
	var i = this.cardTemplates.length; while(i--) {
		if(this.cardTemplates[i].id == id) {
			template = this.cardTemplates[i];
			break;
		}
	}
	return template;
};

/*
CardRenderer.prototype.createCanvas = function(width, height) {
	//var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
};
*/

CardRenderer.prototype.applyCss = function(elem, css) {
	var keys = Object.keys(css);
	for(var i = 0; i < keys.length; i++) {
		var name = keys[i];
		var val = css[name];
		if(typeof val === 'number') {
			switch(name) {
				case 'left':
				case 'top':
					val += 'px';
			}
		}
		elem.style[name] = val;
	}
};

// Resource loaders

CardRenderer.loadJsonResource = function(url) {
	return fetch(url).then(function (response) {
		return response.text();
	}).then(function(responseText) {
		return JSON.parse(responseText);
	});
};

CardRenderer.loadImageResource = function(url) {
	var img = new Image();
	img.crossOrigin = 'anonymous';
	img.src = url;
	return imgToPromise(img);
};

CardRenderer.loadFontResource = function(res) {
	var font = {
		name: res.name,
		family: res.fontFamily,
		weight: res.fontWeight,
		src: res.url
	};
	font.css = font.weight+' 32px \''+font.family+'\'';
	var css = '@font-face {'+
		'font-family: \''+font.family+'\';'+
		'font-weight: '+font.weight+';'+
		'src: url('+font.src+') format(\'woff2\');'+
		'}';
	var style = document.createElement('style');
	font.style = style;
	style.type = 'text/css';
	style.appendChild(document.createTextNode(css));
	var head = document.getElementsByTagName('head')[0];
	head.appendChild(style);
	return document.fonts.load(font.css);
};

// Helpers
	function imgToPromise(img) {
		return new Promise(function(resolve, reject) {
			if(img.complete) return resolve(img);
			img.onload = function() {
				resolve(img);
			};
			img.onerror = function() {
				reject(new Error('Error loading image: '+img.src));
			};
		});
	};

	function promiseSer(tasks, f) {
		return tasks.reduce(function(p, task, idx) {
			return p.then(function() {
				f(task, idx);
			});
		}, Promise.resolve());
	}
	
	function promisePar(tasks, f) {
		return Promise.all(tasks.map(function(task, idx) {
			return f(task, idx);
		}));
	}

	
// export in common js
if( typeof module !== "undefined" && ('exports' in module)){
	module.exports = CardRenderer;
}
})();