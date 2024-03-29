const Sim = require("../../dist")
const path = require("path");

// this example is the same as the basic example, except the topology is easier.
// This format is what you'd write to start out, after which you edit with the gui.

class CrownstoneNode extends Sim.Crownstone {
  handleAdvertisement(from, data, rssi) {
    this.broadcastBurst({macAddress: from, rssi}, 5,1);
  }
}

let sim = new Sim.MeshSimulator()
sim.setTopologyFromFile(path.join(__dirname,'./topology.json'), {CROWNSTONE: CrownstoneNode})
sim.waitForConnection().then(() => {
  sim.run(100)
})
// Gui does the rest.
