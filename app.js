const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipc = require('electron').ipcMain;

const SensorTag = require('sensortag');
const osc = require('node-osc');

var client = null;

var mainWindow = null;
var tag = null;
var tagConnected = false;
var accConnected = false;
var gyroConnected = false;
var magConnected = false;
var irConnected = false;
var humidityConnected = false;
var baroConnected = false;
var luxoConnected = false;
var keysConnected = false;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  TAGS = {};

  // Discover available SensorTags
  ipc.on('go', function(){

    SensorTag.discoverAll(function(tag){
      console.log("send discovered", tag.uuid);
      TAGS[tag.id] = tag;

      //TODO: Is this a good practice to do?
      tag.connectAndSetup(function(error){
        if (tag.connectedAndSetUp) {
          console.log("AAA");
          tag.readSystemId(function (_, systemID) {
            console.log("A "+systemID);
            tag.disconnect(function(error){console.log(error);});
            mainWindow.webContents.send('discovered', tag.id, systemID);
          });
        } else{
          console.log(error);
        }
      });

    });
  });

  // Connect to a sensortag
  ipc.on('connect', function(_, id) {

    // Send OSC messages to localhost on port 6006
    client = new osc.Client('127.0.0.1', 6006);

    tag = TAGS[id];
    tag.connectAndSetUp(function(error){
      if (tag.connectedAndSetUp) {
        tagConnected = true;
        mainWindow.webContents.send('connected');
      } else {
        console.log(error);
      }
    });
  });

  // Disconnect from the Sensortag
  ipc.on('disconnect', function(){
    tagConnected = false;
    tag.disconnect(function(error){console.log(error);});
  });

  // Accelerometer Notifications
  ipc.on('notifyAccelerometer', function(_, isEnabled){
    accConnected = isEnabled;
    if (accConnected){
      tag.enableAccelerometer(function(error){console.log(error);});
      tag.notifyAccelerometer(function(error){console.log(error);});
      tag.setAccelerometerPeriod(100, function(error){console.log(error);});
      tag.on('accelerometerChange', function(x, y, z) {
        client.send('/accelerometer', x.toFixed(4), y.toFixed(4), z.toFixed(4));
        //accConnected = true;
      });
    } else {
      // remove event handler
      tag.disableAccelerometer(function(error){console.log(error);});
      tag.unnotifyAccelerometer(function(error){console.log(error);});
      tag.removeAllListeners('accelerometerChange');
    }
  });

  // Gyroscope Notifications
  ipc.on('notifyGyroscope', function(_, isEnabled){
    gyroConnected = isEnabled;
    if (gyroConnected){
      tag.enableGyroscope(function(error){console.log(error);});
      tag.notifyGyroscope(function(error){console.log(error);});
      tag.setGyroscopePeriod(100, function(error){console.log(error);});
      tag.on('gyroscopeChange', function(x, y, z) {
        client.send('/gyroscope', x.toFixed(4), y.toFixed(4), z.toFixed(4));
        //  console.log(x, y, z);
      });
    } else {
      tag.disableGyroscope(function(error){console.log(error);});
      tag.unnotifyGyroscope(function(error){console.log(error);});
      tag.removeAllListeners('gyroscopeChange');
    }
  });

  // Magnetometer Notifications
  ipc.on('notifyMagnetometer', function(_, isEnabled){
    magConnected = isEnabled;
    if (magConnected){
      tag.enableMagnetometer(function(error){console.log(error);});
      tag.notifyMagnetometer(function(error){console.log(error);});
      tag.setMagnetometerPeriod(100, function(error){console.log(error);});
      tag.on('magnetometerChange', function(x, y, z) {
        client.send('/magnetometer', x.toFixed(4), y.toFixed(4), z.toFixed(4));
        //  console.log(x, y, z);
      });
    } else {
      tag.disableMagnetometer(function(error){console.log(error);});
      tag.unnotifyMagnetometer(function(error){console.log(error);});
      tag.removeAllListeners('magnetometerChange');
    }
  });

  // IR Temperature Notifications
  ipc.on('notifyTemp', function(_, isEnabled){
    irConnected = isEnabled;
    if (irConnected) {
      tag.enableIrTemperature(function(error){console.log(error);});
      tag.notifyIrTemperature(function(error){console.log(error);});
      tag.setIrTemperaturePeriod(310, function(error){console.log(error);});
      tag.on('irTemperatureChange', function (objectTemperature, ambientTemperature) {
        client.send('/IrTemperature', objectTemperature.toFixed(4), ambientTemperature.toFixed(4));
      });
    } else {
      tag.unnotifyIrTemperature(function(error){console.log(error);});
      tag.disableIrTemperature(function(error){console.log(error);});
      tag.removeAllListeners('irTemperatureChange');
    }
  });

  // Humidity Notifications (also has a temperature reading)
  ipc.on('notifyHumidity', function(_, isEnabled){
    humidityConnected = isEnabled;
    if (humidityConnected) {
      tag.enableHumidity(function(error){console.log(error);});
      tag.setHumidityPeriod(100, function(error){console.log(error);});
      tag.notifyHumidity(function(error){console.log(error);});
      tag.on('humidityChange', function (temperature, humidity) {
        client.send('/humidity', temperature.toFixed(4), humidity.toFixed(4));
      });
    } else {
      tag.unnotifyHumidity(function(error){console.log(error);});
      tag.disableHumidity(function(error){console.log(error);});
      tag.removeAllListeners('humidityChange');
    }
  });

  // Barometric Pressure Notifications
  ipc.on('notifyPressure', function(_, isEnabled){
    baroConnected = isEnabled;
    if (baroConnected) {
      tag.enableBarometricPressure(function(error){console.log(error);});
      tag.notifyBarometricPressure(function(error){console.log(error);});
      tag.setBarometricPressurePeriod(100, function(error){console.log(error);});
      tag.on('barometricPressureChange', function (pressure) {
        client.send('/pressure', pressure.toFixed(4));
      });
    } else {
      tag.unnotifyBarometricPressure(function(error){console.log(error);});
      tag.disableBarometricPressure(function(error){console.log(error);});
      tag.removeAllListeners('barometricPressureChange');
    }
  });

  // Luxometer Notifications
  ipc.on('notifyLuxometer', function(_, isEnabled){
    luxoConnected = isEnabled;
    if (isEnabled) {
      tag.enableLuxometer(function(error){console.log(error);});
      tag.setLuxometerPeriod(100, function(error){console.log(error);});
      tag.notifyLuxometer(function(error){console.log(error);});
      tag.on('luxometerChange', function (lux) {
        client.send('/luxometer', lux.toFixed(4));
      });
    } else {
      tag.unnotifyLuxometer(function(error){console.log(error);});
      tag.disableLuxometer(function(error){console.log(error);});
      tag.removeAllListeners('luxometerChange');
    }
  });

  // Simple Key Notifications
  ipc.on('notifySimpleKey', function(_, isEnabled){
    keysConnected = isEnabled;
    if (keysConnected) {
      tag.notifySimpleKey(function(error){console.log(error);});
      tag.on('simpleKeyChange', function (left, right, reedRelay) {
        client.send('/buttons', left.toString(), right.toString(), reedRelay.toString());
      });
    } else {
      tag.unnotifySimpleKey(function(error){console.log(error);});
      tag.removeAllListeners('simpleKeyChange');
    }
  });

  mainWindow.on('closed', function() {
    if (tagConnected) {
      tag.disconnect(function(error){console.log(error);});
    }
    mainWindow = null;
  });
});

