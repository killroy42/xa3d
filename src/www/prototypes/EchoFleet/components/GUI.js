(() => {


const GUI_STYLES = {
	guiRoot: {
		pointerEvents: 'none',
		position: 'fixed',
		display: 'block',
		top: 0, left: 0,
		width: '100%', height: '100%',
		outline: '10px solid rgba(83, 94, 116, 0.1)',
		outlineOffset: '-10px',
		zIndex: 10000
	},
	guiPanel: {
		pointerEvents: 'none',
		zIndex: 10000,
		position: 'absolute',
		display: 'block',
		left: 'auto', right: 'auto', top: 'auto', bottom: 'auto',
		width: 'auto', height: 'auto',
		outline: '2px solid', outlineOffset: '-2px',
		font: '20px Arial',
		textAlign: 'center',
		lineHeight: '90px',
	},
	guiPanelColors: {
		background: 'hsla(217, 27%, 44%, 0.2)',
		outlineColor: 'hsla(228, 2%, 88%, 0.3)',
		color: 'hsla(200, 90%, 43%, 0.3)',
	},
	guiButton: {
		pointerEvents: 'all',
		cursor: 'pointer',
		zIndex: 10000,
		position: 'absolute',
		display: 'block',
		left: 'auto', right: 'auto', top: 'auto', bottom: 'auto',
		width: 'auto', height: 'auto',
		outline: '2px solid', outlineOffset: '-2px',
		font: '20px Arial',
		textAlign: 'center',
		lineHeight: '90px',
	},
	guiButtonColors: {
		background: 'hsla(220, 93%, 31%, 0.2)',
		outlineColor: 'rgba(194, 92%, 73%, 0.5)',
		color: 'hsla(188, 80%, 80%, 0.8)',
	},
	guiButtonHoverColors: {
		background: 'hsla(220, 93%, 31%, 0.5)',
		outlineColor: 'rgba(194, 92%, 83%, 0.8)',
		color: 'hsla(188, 80%, 90%, 1.0)',
	},
};

class GuiStyled {
	constructor(opts) {
		const style = Object.assign({}, opts);
		delete style.label;
		this.style = this.parseStyle(style);
		this.style.lineHeight = this.style.height;
	}
	parseStyle(props) {
		const style = {};
		Object.keys(props).forEach(prop =>
			style[prop] = (typeof props[prop] === 'number')
				?`${parseFloat(props[prop])}px`
				:props[prop]
		);
		return style;
	}
}

class GuiButton extends GuiStyled {
	constructor(opts) {
		const label = opts.label;
		opts = Object.assign({}, opts);
		delete opts.label;
		super(opts);
		this.elem = undefined;
		this.label = label;
	}
	render() {
		if(this.elem !== undefined) return this.elem;
		const {label, style} = this;
		const elem = this.elem = document.createElement('div');
		Object.assign(elem.style, GUI_STYLES.guiButton, GUI_STYLES.guiButtonColors, style);
		elem.innerHTML = `<span style="display: inline-block; vertical-align: middle; line-height: 24px;">${label}</span>`;
		elem.addEventListener('mouseenter', event => Object.assign(event.target.style, GUI_STYLES.guiButtonHoverColors));
		elem.addEventListener('mouseleave', event => Object.assign(event.target.style, GUI_STYLES.guiButtonColors));
		return elem;
	}
}

class GuiPanel extends GuiStyled {
	constructor(opts) {
		const label = opts.label;
		const buttons = opts.buttons || [];
		opts = Object.assign({}, opts);
		delete opts.label;
		delete opts.buttons;
		super(opts);
		this.elem = undefined;
		this.buttons = [];
		this.label = label;
		buttons.forEach(button => this.addButton(new GuiButton(button)));
	}
	addButton(button) {
		this.buttons.push(button);
		this.render().appendChild(button.render());
	}
	render() {
		if(this.elem !== undefined) return this.elem;
		const {label, style} = this;
		const elem = this.elem = document.createElement('div');
		Object.assign(elem.style, GUI_STYLES.guiPanel, GUI_STYLES.guiPanelColors, style);
		elem.innerHTML = `<span style="display: inline-block; vertical-align: middle; line-height: 24px;">${label}</span>`;
		return elem;
	}
}

class GuiScreen {
	constructor() {
		this.handleWindowResize = this.handleWindowResize.bind(this);
		this.window = window;
		this.canvas = null;
		this.domElement = null;
		this.styles = GUI_STYLES;
		this.panels = [];
	}
	handleWindowResize() {
		const {window: {innerWidth: width, innerHeight: height}} = this;
		Object.assign(this.guiRoot.style, {
			width: `${width}px`,
			height: `${height}px`,
		});
	}
	createPanel(label, style) {
		const {styles, guiRoot} = this;
		const guiPanel = document.createElement('div');
		Object.assign(guiPanel.style, styles.guiPanel, styles.guiPanelColors, style, {lineHeight: `${parseInt(style.height)}px`});
		guiPanel.innerHTML = `<span style="display: inline-block; vertical-align: middle; line-height: 24px;">${label}</span>`;
		guiRoot.appendChild(guiPanel);
		return guiPanel;
	}
	createButton(panel, label, style) {
		const {styles, guiRoot} = this;
		const guiButton = document.createElement('div');
		Object.assign(guiButton.style, styles.guiButton, styles.guiButtonColors, style, {lineHeight: `${parseInt(style.height)}px`});
		guiButton.innerHTML = `<span style="display: inline-block; vertical-align: middle; line-height: 24px;">${label}</span>`;
		guiButton.addEventListener('mouseenter', event => Object.assign(event.target.style, styles.guiButtonHoverColors));
		guiButton.addEventListener('mouseleave', event => Object.assign(event.target.style, styles.guiButtonColors));
		panel.appendChild(guiButton);
		return guiButton;
	}
	addPanel(panel) {
		this.panels.push(panel);
		this.guiRoot.appendChild(panel.render());
	}
	OnAttachComponent(entity) {
		const entities = entity.entities;
		const renderer = entities.findComponent('Renderer');
		this.canvas = renderer.domElement;
		const guiParent = this.canvas.parentNode;
		const guiRoot = this.guiRoot = document.createElement('div');
		Object.assign(guiRoot.style, this.styles.guiRoot);
		guiParent.appendChild(guiRoot);
		window.addEventListener('resize', this.handleWindowResize);
		this.handleWindowResize();
	}
}


if(typeof module !== 'undefined' && ('exports' in module)) {
	const GUI = {
		GuiButton,
		GuiPanel,
		GuiScreen,
	};
	module.exports = GUI;
	module.exports.GUI = GUI;
}
})();