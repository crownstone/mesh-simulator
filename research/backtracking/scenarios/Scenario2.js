const Sim = require("../../../dist")
const parseStatistics = require("../util/analyse")
const { CrownstoneBackTracker, HubBackTracker } = require("../nodes/backtracking")

/**
 * We now implement backtracking, so each node only uses the TTL required to reach the hub.
 * Every second the hub sends a message out to the mesh with repeat (mesh repeat)
 * 2 and ttl 20 to let the rest know where it is.
 *
 * The ttl is averaged exponentially with factor 0.2 and ceiled.
 */

async function run(topology, runTime = 500, preprocessingTime = 10, print = true, useGUI = false) {
  let sim = new Sim.MeshSimulator(useGUI)
  sim.setTopologyFromFile(topology, {HUB: HubBackTracker, CROWNSTONE: CrownstoneBackTracker})

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
