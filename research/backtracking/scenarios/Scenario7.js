const Sim = require("../../../dist")
const path = require("path");
const parseStatistics = require("../util/analyse")
const { CrownstoneBackTrackerMoreHopsOptimized, HubBackTrackerOptimized } = require("../nodes/backtracking")

/**
 * We will do the same as scenario 6,
 * but we revert the TTL of the hub messages
 * back to the minimum required (as in 2).
 */

class EditedNode extends CrownstoneBackTrackerMoreHopsOptimized {
  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcast({macAddress: from, rssi}, this.hubTTL, 2, this.hubId)
    }
  }
}

async function run(topology, runTime = 500, preprocessingTime = 10, print = true, useGUI = false) {
  let sim = new Sim.MeshSimulator(useGUI)
  sim.setTopologyFromFile(topology,
    {
      HUB: HubBackTrackerOptimized,
      CROWNSTONE: EditedNode
    })
  if (useGUI) {
    await sim.waitForConnection()
  }
  await sim.run(runTime, preprocessingTime);
  let summary = parseStatistics(sim, print)


  if (useGUI) {
    process.exit()
  }
  else {
    return summary;
  }
}


module.exports = run;




