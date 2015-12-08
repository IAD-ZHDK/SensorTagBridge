const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipc = require('electron').ipcMain;

const SensorTag = require('sensortag');
const osc = require('node-osc');

var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  TAGS = {};

  ipc.on('go', function(){
    SensorTag.discoverAll(function(tag){
      console.log("send discovered", tag.id);
      TAGS[tag.id] = tag;
      mainWindow.webContents.send('discovered', tag.id);
    });
  });

  ipc.on('connect', function(_, id) {
    var client = new osc.Client('10.128.135.75', 6006);

    var tag = TAGS[id];
    tag.connectAndSetUp(function(){
      tag.enableAccelerometer();
      tag.notifyAccelerometer();
      tag.setAccelerometerPeriod(100);
      tag.on('accelerometerChange', function(x, y, z){
        client.send('/accelerometer', x, y, z);
        console.log(x, y, z);
      });
    });
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
