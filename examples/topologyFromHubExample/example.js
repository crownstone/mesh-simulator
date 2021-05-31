const Sim = require("../../dist")
const { getTopology } = require("./util")

async function runExample() {

  // Get the topology from the hub.
  // Ensure you have a hubData.json in this folder based on the provided template.
  let hubTopology = await getTopology()

  // We get the classes we want to use to construct the simulation nodes.
  const CrownstoneNode = require("./customNodes");

  // we create a function to convert the hub topology into simulatable objects.
  function mapTopology(topology) {
    let simNodes = [];
    let simConnections = [];
    let idMap = {};
    for (let node of topology.nodes) {
      idMap[node.uid] = node.macAddress;

      if (node.type === "CROWNSTONE_HUB") {
        simNodes.push(new Sim.Hub(node.uid, node.macAddress))
      } else {
        simNodes.push(new CrownstoneNode(node.uid, node.macAddress))
      }
    }

    // connections in the simulator are defined by macaddresses.
    for (let connection of topology.connections) {
      simConnections.push({from: idMap[connection.from], to: idMap[connection.to], rssi: connection.rssi})
    }

    return {nodes: simNodes, connections: simConnections}
  }

  // convert the hub topology to a simulation topology
  let simTopology = mapTopology(hubTopology);

  // add an asset to the mix which will broadcast every 100 ms.
  let asset = new Sim.Asset(100);
  simTopology.nodes.push(asset);

  // connect the asset to the nodes you want to receive it's advertisements
  for (let node of simTopology.nodes) {
    if (node.type === "CROWNSTONE") {
      // pick the RSSI you want, either per channel, or average.
      // per channel would look like {from, to, rssi: {37: -60, 38: -55, 39: -50}}
      simTopology.connections.push({from: asset.macAddress, to: node.macAddress, rssi: -60})
    }
  }

  // create the simulator and load the nodes and connections
  let simulator = new Sim.MeshSimulator();
  simulator.addNodes(simTopology.nodes);
  simulator.addConnections(simTopology.connections);

  // wait for the gui to connect
  await simulator.waitForConnection();

  // run a simulation.
  await simulator.run(100);
}

runExample()

