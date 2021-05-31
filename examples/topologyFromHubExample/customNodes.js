const { Crownstone } = require("../../dist/nodes/Crownstone");

class CrownstoneNode extends Crownstone {
  handleAdvertisement(from, data, rssi) {
    this.broadcastBurst({macAddress: from, rssi}, 5, 1)
  }
}


module.exports = CrownstoneNode