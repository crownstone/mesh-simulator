const Sim = require("../../../dist")
const path = require("path");
const parseStatistics = require("../util/analyse")
const { CrownstoneBackTrackerMoreHopsOptimized, HubBackTrackerOptimized } = require("../nodes/backtracking")

/**
 * Same as 4, but we will now set the burst transmissions to 2. So each advertisement a node receives,
 * it will send 2 messages into the mesh in quick succession.
 * A relay will still transmit 1 message so this remains the same as scenario 4.
 */

class EditedNode extends CrownstoneBackTrackerMoreHopsOptimized {
  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcastBurst({macAddress: from, rssi}, this.hubTTL + 1, 2, this.hubId)
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


