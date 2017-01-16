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
		x: -1920 + 400, y: 100,
		width: 1280, height: 720,
		frame: true
	});
	
	console.log('__dirname:', __dirname);
	mainWindow.loadURL('file://' + __dirname + '/index.html');

	mainWindow.webContents.openDevTools();

	let displays = electron.screen.getAllDisplays();
	console.log('displays:', displays);

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
});
