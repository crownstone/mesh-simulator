import {Hub} from "../nodes/Hub";
import {MeshNetwork} from "../MeshNetwork";
import {SocketServer} from "../servers/socketServer";
import {Crownstone} from "../nodes/Crownstone";
import {StatisticsCollector} from "../statistics/StatisticsCollector";

let server = new SocketServer()
let RECEIVED_MESSAGES = [];

class HubNode extends Hub {
  handleMeshMessage(source: crownstoneId, sentBy: macAddress, data, ttl: number, repeats: number) {
    RECEIVED_MESSAGES.push({source, sentBy, data, ttl, repeats})
  }
}

class CrownstoneNode extends Crownstone {

  start() {
    this.meshTimer.setInterval(() => {
      this.broadcastBurst("test", 5, 1)
    }, 100)
  }


}

let meshNetwork = new MeshNetwork();

let topology = {
  nodes: [
    new CrownstoneNode(7),
    new Crownstone(8),
  ],
  assets: [
    // new Asset(100),
  ],
  connections: []
};
function i2m(id) {
  for (let node of topology.nodes) {
    if (node.crownstoneId == id) {
      return node.macAddress;
    }
  }
}

let statistics = new StatisticsCollector();

// mesh topology
// topology.connections.push({from:i2m(1), to: i2m(2)})
// topology.connections.push({from:i2m(1), to: i2m(3)})
// topology.connections.push({from:i2m(1), to: i2m(4)})
// topology.connections.push({from:i2m(2), to: i2m(5)})
// topology.connections.push({from:i2m(2), to: i2m(6)})
// topology.connections.push({from:i2m(4), to: i2m(6)})
topology.connections.push({from:i2m(7), to: i2m(8)})
// topology.connections.push({from:i2m(1), to: i2m(7)})

// asset topology
// topology.connections.push({from: i2m(2), to: topology.assets[0].macAddress})
// topology.connections.push({from: i2m(3), to: topology.assets[0].macAddress})
// topology.connections.push({from: i2m(5), to: topology.assets[0].macAddress})
// topology.connections.push({from: i2m(6), to: topology.assets[0].macAddress})
// topology.connections.push({from: i2m(7), to: topology.assets[0].macAddress})
// topology.connections.push({from: i2m(8), to: topology.assets[0].macAddress})

for (let node of topology.nodes)             { meshNetwork.addNode(node) }
for (let asset of topology.assets)           { meshNetwork.addNode(asset) }
for (let connection of topology.connections) { meshNetwork.addConnection(connection.from, connection.to) }

statistics.initialize(meshNetwork.nodeIdMap, meshNetwork.nodes);

server.setMessageHandler(async (message) => {
  if (typeof message !== 'object') { return; }

  if (message.type == "LOAD_TOPOLOGY") {
    /**
     * message.data = {nodes: {crownstoneId, macAddress, type}[], connections: {from: macAddress, to: macAddress, rssi}[]}
     * type = "CROWNSTONE", "HUB", "ASSET"
     */
  }
  else if (message.type == "GET_TOPOLOGY") {
    let data = {
      nodes: [],
      edges: topology.connections
    };
    for (let node of topology.nodes)   { data.nodes.push({id: node.macAddress, cid: node.crownstoneId, type: node.type})}
    for (let asset of topology.assets) { data.nodes.push({id: asset.macAddress, type: asset.type}) }
    server.send({type:"TOPOLOGY", data: data})
  }
  else if (message.type == "SET_SIMULATION_PARAMETERS") {
    /**
     * message.data = { rate: number }
     */
  }
  else if (message.type == "RUN_SIMULATION") {
    statistics.reset()
    await meshNetwork.runFor(message.data);
    statistics.finalize();
    server.send({type:"STATISTICS", data: statistics.nodes})
  }
})

async function run() {
  console.log("Waiting for connection...")
  await server.connectionEstablished();
  console.log("Connection established.")
  console.log("Simulating...")
  await meshNetwork.runFor(500);
  console.log("Done.")
  console.log("Sending results...")
  statistics.finalize();
  server.send({type:"STATISTICS", data: statistics.nodes})
  console.log("Done.")

}
run()


