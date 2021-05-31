const Sim = require("../../dist")
const path = require("path");

class CrownstoneNode extends Sim.Crownstone {
  handleAdvertisement(from, data, rssi) {
    this.broadcastBurst({macAddress: from, rssi}, 5, 1)
  }
}

let sim = new Sim.MeshSimulator()

// Just by adding this line, any changes you make to the topology in the GUI are stored in this file for future usage.
sim.allowNewTopology(path.join(__dirname,'./topology.json'))

sim.setTopologyFromFile(path.join(__dirname,'./topology.json'), {CROWNSTONE: CrownstoneNode})
sim.waitForConnection().then(() => {
  sim.run(100)
})
// Gui does the rest.
