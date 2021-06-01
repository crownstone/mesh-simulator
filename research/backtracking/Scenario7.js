const Sim = require("../../dist")
const path = require("path");
const parseStatistics = require("./analyse")

/**
 * We will do the same as scenario 6, but we revert the TTL
 * of the hub messages back to the minimum required (as in 2).
 */


class HubNode extends Sim.Hub {
  start() {
    this.meshTimer.setInterval(() => { this.broadcast("IM_A_HUB", 20, 2); }, 1000)
  }

  allowMeshRelay(source, target, ttl) {
    return false;
  }
}

class CrownstoneNode extends Sim.Crownstone {
  hubId  = null;
  hubTTL = null;

  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcast({macAddress: from, rssi}, Math.ceil(this.hubTTL), 2, this.hubId)
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

  allowMeshRelay(source, target, ttl) {
    if (target === this.hubId) {
      if (ttl >= this.hubTTL) {
        return true
      }
    }
    else if (target === null) {
      return true;
    }
    return false;
  }
}

let sim = new Sim.MeshSimulator(false)

// Just by adding this line, any changes you make to the topology in the GUI are stored in this file for future usage.
sim.allowNewTopology(path.join(__dirname,'./double_string.json'))
sim.setTopologyFromFile(path.join(__dirname,'./double_string.json'), {HUB: HubNode, CROWNSTONE: CrownstoneNode})
return sim.run(500, 10)
  .then(() => {
    try {
      parseStatistics(sim);
    }
    catch (err) {
      console.error(err);
    }
    process.exit()
  })

