// This function is borrowed from https://github.com/ojousima/node-red/blob/master/ruuvi-node/ruuvitag.js
// which is licenced under BSD-3
// Credits to GitHub user ojousima

const parseRawRuuvi = function (manufacturerDataString) {
  const humidityStart = 6;
  const humidityEnd = 8;
  const temperatureStart = 8;
  const temperatureEnd = 12;
  const pressureStart = 12;
  const pressureEnd = 16;
  const accelerationXStart = 16;
  const accelerationXEnd = 20;
  const accelerationYStart = 20;
  const accelerationYEnd = 24;
  const accelerationZStart = 24;
  const accelerationZEnd = 28;
  const batteryStart = 28;
  const batteryEnd = 32;

  const robject = {};

  let humidity = manufacturerDataString.substring(humidityStart, humidityEnd);
  humidity = parseInt(humidity, 16);
  humidity /= 2; // scale
  robject.humidity = humidity;

  const temperatureString = manufacturerDataString.substring(temperatureStart, temperatureEnd);
  let temperature = parseInt(temperatureString.substring(0, 2), 16); // Full degrees
  temperature += parseInt(temperatureString.substring(2, 4), 16) / 100; // Decimals
  if (temperature > 128) {
    // Ruuvi format, sign bit + value
    temperature = temperature - 128;
    temperature = 0 - temperature;
  }
  robject.temperature = +temperature.toFixed(2); // Round to 2 decimals, format as a number

  let pressure = parseInt(manufacturerDataString.substring(pressureStart, pressureEnd), 16); // uint16_t pascals
  pressure += 50000; // Ruuvi format
  robject.pressure = pressure; // Pa

  let accelerationX = parseInt(manufacturerDataString.substring(accelerationXStart, accelerationXEnd), 16); // milli-g
  if (accelerationX > 32767) {
    accelerationX -= 65536;
  } // two's complement

  let accelerationY = parseInt(manufacturerDataString.substring(accelerationYStart, accelerationYEnd), 16); // milli-g
  if (accelerationY > 32767) {
    accelerationY -= 65536;
  } // two's complement

  let accelerationZ = parseInt(manufacturerDataString.substring(accelerationZStart, accelerationZEnd), 16); // milli-g
  if (accelerationZ > 32767) {
    accelerationZ -= 65536;
  } // two's complement

  robject.accelerationX = accelerationX;
  robject.accelerationY = accelerationY;
  robject.accelerationZ = accelerationZ;

  const battery = parseInt(manufacturerDataString.substring(batteryStart, batteryEnd), 16); // milli-g
  robject.battery = battery;

  return robject;
};

module.exports = {
  parse: buffer => parseRawRuuvi(buffer.toString('hex'))
};
