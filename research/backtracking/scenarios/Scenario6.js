const Sim = require("../../../dist")
const path = require("path");
const parseStatistics = require("../util/analyse")
const { CrownstoneBackTrackerMoreHopsOptimized, HubBackTrackerOptimized } = require("../nodes/backtracking")

/**
 * Same as 4, but we will now use the mesh repeats.
 * So each advertisement a node receives, it will send 2 messages into the mesh in quick succession.
 * A relay will ALSO transmit 2 messages.
 */

class EditedNode extends CrownstoneBackTrackerMoreHopsOptimized {
  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcast({macAddress: from, rssi}, this.hubTTL + 1, 2, this.hubId)
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


