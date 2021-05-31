const Sim = require("../../dist")
const path = require("path");

class CrownstoneNode extends Sim.Crownstone {
  handleAdvertisement(from, data, rssi) {
    this.broadcastBurst({macAddress: from, rssi}, 5, 1)
  }
}
// The false here disables the websocket server
let sim = new Sim.MeshSimulator(false)

sim.setTopologyFromFile(path.join(__dirname,'./topology.json'), {CROWNSTONE: CrownstoneNode})

sim.run(100);

// this gets the statistics collected by the system.
console.log("Here is the result:", JSON.stringify(sim.report(), undefined, 2))