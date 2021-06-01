const Sim = require("../../dist")
const path = require("path");

class CrownstoneNode extends Sim.Crownstone {
  handleAdvertisement(from, data, rssi) {
    this.broadcastBurst({macAddress: from, rssi}, 10, 1)
  }
}

let sim = new Sim.MeshSimulator()

// Just by adding this line, any changes you make to the topology in the GUI are stored in this file for future usage.
sim.allowNewTopology(path.join(__dirname,'./double_string.json'))
sim.setTopologyFromFile(path.join(__dirname,'./double_string.json'), {CROWNSTONE: CrownstoneNode})
sim.waitForConnection().then(() => {
  sim.run(500)
})
// Gui does the rest.
