const Sim = require("../../../dist")
const parseStatistics = require("../util/analyse")
const { CrownstoneBackTrackerMoreHopsOptimized, HubBackTrackerOptimized } = require("../nodes/backtracking")

/**
 * We will do the same as scenario 6,
 * but add an additional hop to the amount of hops required to reach the hub.
 */

class EditedNode extends CrownstoneBackTrackerMoreHopsOptimized {
  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcast({macAddress: from, rssi}, this.hubTTL + 2, 2, this.hubId)
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
  sim.destroy()

  if (useGUI) {
    process.exit()
  }
  else {
    return summary;
  }
}

module.exports = {
  name: 'Scenario 8',
  description:`We will do the same as scenario 6,
 but add an additional hop to the amount of hops required to reach the hub.`,
  runner: run
};



