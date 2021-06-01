const Sim = require("../../dist")
const path = require("path");
const parseStatistics = require("./analyse")

/**
 * The first scenario has TTL=10 and a burst count of 5.
 * This means a node which receives an advertisement will send 5 messages into the mesh (1 unique, 5 transmissions).
 * Once a node receives it, it will relay it only once.
 */

class CrownstoneNode extends Sim.Crownstone {
  handleAdvertisement(from, data, rssi) {
    this.broadcastBurst({macAddress: from, rssi}, 10, 1)
  }
}

let sim = new Sim.MeshSimulator(false)

// Just by adding this line, any changes you make to the topology in the GUI are stored in this file for future usage.
sim.allowNewTopology(path.join(__dirname,'./double_string.json'))
sim.setTopologyFromFile(path.join(__dirname,'./double_string.json'), {CROWNSTONE: CrownstoneNode})
sim.run(500, 10)
  .then(() => {
    try {
      parseStatistics(sim);
    }
    catch (err) {
      console.error(err);
    }
    process.exit()
  })


