const Sim = require("../../../dist")
const parseStatistics = require("../util/analyse")
const { CrownstoneBackTrackerMoreHops, HubBackTracker } = require("../nodes/backtracking")

/**
 * Same as 2, but minTTL + 1.
 */



async function run(topology, runTime = 500, preprocessingTime = 10, print = true, useGUI = false) {
  let sim = new Sim.MeshSimulator(useGUI)
  sim.setTopologyFromFile(topology, {HUB: HubBackTracker, CROWNSTONE: CrownstoneBackTrackerMoreHops})

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
  name: 'Scenario 3',
  description:`Same as 2, but minTTL + 1.`,
  runner: run
};