const Sim = require("../../dist")
const path = require("path");

class CrownstoneNode extends Sim.Crownstone {
  handleAdvertisement(from, data, rssi) {
    this.broadcastBurst({macAddress: from, rssi}, 5, 1);
  }
}

let sim = new Sim.MeshSimulator()
sim.setTopologyFromFile(path.join(__dirname,'./topology.json'), {CROWNSTONE: CrownstoneNode})
sim.waitForConnection().then(() => {
  sim.run(100)
})
// Gui does the rest.
