const axios = require('axios');
const gatewayHelper = require('../Helpers/gatewayHelper.js');
const parseSemVer = require('semver-parser');

/**
 * Sends received status to external service for logging.
 */
exports.handler = async (event, context) => {
  const eventBody = JSON.parse(event.body);
  const espVersion = parseSemVer(eventBody.ESP_FW, false);
  const nrfVersion = parseSemVer(eventBody.NRF_FW, false);

  // If version is not valid SEMVER
  if ((!espVersion.matches) || (!nrfVersion.matches)) {
    return gatewayHelper.invalid();
  } else {
    const espIntegral = espVersion.major * 10000 + espVersion.minor * 100 + espVersion.patch;
    const nrfIntegral = nrfVersion.major * 10000 + nrfVersion.minor * 100 + nrfVersion.patch;
    axios.post('http://graphs.ruuvi.com:3001/gw_statistics', {
      gw_addr: eventBody.DEVICE_ADDR,
      esp_fw: espIntegral,
      nrf_fw: nrfIntegral,
      uptime: eventBody.UPTIME,
      connection: eventBody.CONNECTION,
      sensors_seen: eventBody.SENSORS_SEEN,
      active_sensors: eventBody.ACTIVE_SENSORS.length,
      inactive_sensors: eventBody.INACTIVE_SENSORS.length
    }).then(res => {
      return gatewayHelper.ok(null);
    }).catch(error => {
      // Assume internal error in case of exception in analytics post.
      console.log(error);
      return gatewayHelper.internal();
    });
  }
  // Return error if we're here for any reason.
  return gatewayHelper.invalid();
};

/*
{
  "DEVICE_ADDR":  "DD:C3:3B:AB:2F:FC",
  "ESP_FW":  "v1.9.2",
  "NRF_FW":  "v0.7.2",
  "UPTIME":  "21",
  "NONCE":  "2446742296",
  "CONNECTION":  "WIFI",
  "NUM_CONN_LOST":  "0",
  "SENSORS_SEEN":  "19",
  "ACTIVE_SENSORS":  [{
      "MAC":  "C5:2A:E7:4D:CE:7E",
      "COUNTER":  "10"
    }, {
      "MAC":  "D7:66:D8:6B:37:F0",
      "COUNTER":  "17"
    }, {
      "MAC":  "F9:D7:E4:D1:12:F2",
      "COUNTER":  "16"
    }, {
      "MAC":  "CD:F2:AA:36:F6:8B",
      "COUNTER":  "16"
    }, {
      "MAC":  "DC:28:F5:9F:0A:CE",
      "COUNTER":  "10"
    }, {
      "MAC":  "E0:E3:2B:22:F4:F5",
      "COUNTER":  "15"
    }, {
      "MAC":  "C6:4B:56:AC:5B:05",
      "COUNTER":  "17"
    }, {
      "MAC":  "D4:94:E2:D7:E9:05",
      "COUNTER":  "15"
    }, {
      "MAC":  "CA:4B:C1:6B:2A:2A",
      "COUNTER":  "17"
    }, {
      "MAC":  "DD:99:0A:C1:AA:B7",
      "COUNTER":  "12"
    }, {
      "MAC":  "F2:40:FD:0C:E3:47",
      "COUNTER":  "16"
    }, {
      "MAC":  "CE:19:50:1D:50:A5",
      "COUNTER":  "11"
    }, {
      "MAC":  "FA:60:2B:73:87:E1",
      "COUNTER":  "15"
    }, {
      "MAC":  "D8:BA:7C:C7:4A:83",
      "COUNTER":  "9"
    }, {
      "MAC":  "E5:43:3A:2F:6B:45",
      "COUNTER":  "13"
    }, {
      "MAC":  "D4:29:06:F9:2E:E6",
      "COUNTER":  "1"
    }, {
      "MAC":  "DD:89:F9:1C:7A:4D",
      "COUNTER":  "4"
    }, {
      "MAC":  "FA:3D:0B:1A:8C:71",
      "COUNTER":  "3"
    }, {
      "MAC":  "F2:28:E5:83:C3:E3",
      "COUNTER":  "6"
    }],
  "INACTIVE_SENSORS":  []
}
*/
