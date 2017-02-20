const electron = require('electron');
const {app, BrowserWindow} = electron;
require('electron-reload')(__dirname);

let mainWindow;

app.on('window-all-closed', function() {
	if (process.platform != 'darwin') {
		app.quit();
	}
});

app.on('ready', function() {
	//mainWindow = new BrowserWindow({width: 800, height: 600, frame:false});
	mainWindow = new BrowserWindow({
		/*x: -1920 + 400, y: 100,*/
		width: 1280, height: 720,
		frame: true,
		backgroundColor: '#000000',
		title: 'EchoFleet-Weapons',
		autoHideMenuBar: true,
		darkTheme: true,
		transparent: false,
		//titleBarStyle: 'hidden-inset',
		show: false,
		//alwaysOnTop: true,
		focusable: true,
	});
	
	console.log('__dirname:', __dirname);
	mainWindow.loadURL('file://' + __dirname + '/index.html');
	//mainWindow.setIgnoreMouseEvents(true);
	//mainWindow.webContents.openDevTools();

	//let displays = electron.screen.getAllDisplays();
	//console.log('displays:', displays);

	mainWindow.once('ready-to-show', () => mainWindow.show());
	mainWindow.on('closed', () => mainWindow = null);
});
