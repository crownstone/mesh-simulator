const Sim = require("../../../dist")
const parseStatistics = require("../util/analyse")
const { CrownstoneAssetTracker } = require("../nodes/backtracking")

/**
 * The first scenario has TTL=10 and a burst count of 1.
 * This means a node which receives an advertisement will send 1 message into the mesh.
 * Once a node receives it, it will relay it only once.
 */

async function run(topology, runTime = 500, preprocessingTime = 10, print = true, useGUI = false) {
  let sim = new Sim.MeshSimulator(useGUI)
  sim.setTopologyFromFile(topology, {CROWNSTONE: CrownstoneAssetTracker})

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
