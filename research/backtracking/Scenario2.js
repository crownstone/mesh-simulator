const Sim = require("../../dist")
const path = require("path");
const parseStatistics = require("./analyse")

/**
 * We now implement backtracking, so each node only uses the TTL required to reach the hub.
 * Every second the hub sends a message out to the mesh with repeat (mesh repeat)
 * 2 and ttl 20 to let the rest know where it is.
 *
 * The ttl is averaged exponentially with factor 0.2 and ceiled.
 */


class HubNode extends Sim.Hub {
  start() {
    this.meshTimer.setInterval(() => { this.broadcast("IM_A_HUB", 20, 2); }, 1000)
  }
}

class CrownstoneNode extends Sim.Crownstone {
  hubId  = null;
  hubTTL = null;

  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcastBurst({macAddress: from, rssi}, Math.ceil(this.hubTTL), 1, this.hubId)
    }
  }

  handleMeshMessage(source, sentBy, data, rssi, ttl, repeats) {
    if (data === "IM_A_HUB") {
      this.hubId = source;
      let hopsRequired = 20 - ttl;
      if (this.hubTTL === null) {
        this.hubTTL = hopsRequired;
      }
      let factor = 0.2;
      this.hubTTL = factor*hopsRequired + (1-factor)*this.hubTTL;
    }
  }
}

let sim = new Sim.MeshSimulator(false)

// Just by adding this line, any changes you make to the topology in the GUI are stored in this file for future usage.
sim.allowNewTopology(path.join(__dirname,'./double_string.json'))
sim.setTopologyFromFile(path.join(__dirname,'./double_string.json'), {HUB: HubNode, CROWNSTONE: CrownstoneNode})
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


