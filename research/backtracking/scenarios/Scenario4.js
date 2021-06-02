const Sim = require("../../../dist")
const parseStatistics = require("../util/analyse")
const { CrownstoneBackTrackerMoreHopsOptimized, HubBackTrackerOptimized } = require("../nodes/backtracking")

/**
 * Same as 3, but here we introduce message optimization.
 * Hubs do not relay and relays are only performed if it will increase the chance of the message reaching the hub.
 */

async function run(topology, runTime = 500, preprocessingTime = 10, print = true, useGUI = false) {
  let sim = new Sim.MeshSimulator(useGUI)
  sim.setTopologyFromFile(topology,
    {
      HUB: HubBackTrackerOptimized,
      CROWNSTONE: CrownstoneBackTrackerMoreHopsOptimized
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
  name: 'Scenario 4',
  description:`Same as 3, but here we introduce message optimization.
Hubs do not relay and relays are only performed if it will increase the chance of the message reaching the hub.`,
  runner: run
};

