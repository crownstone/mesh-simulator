const {getTopology, getNetworkStatistics} = require("../../util/util")
const {getHubIdFromTopology} = require("./supportCode")

async function run() {
  let topology = await getTopology();
  let statistics = await getNetworkStatistics()

  let hubId = getHubIdFromTopology(topology);

  let nodeIdMap = {};
  for (let connection of topology.connections) {
    if (connection.to == hubId) {
      nodeIdMap[connection.from] = connection;
    }
    else if (connection.from == hubId) {
      nodeIdMap[connection.to] = connection;
    }
  }


  let rssiMap = {}
  for (let nodeId in nodeIdMap) {
    if (statistics[nodeId]) {
      let stats = statistics[nodeId];
      let rssi = Math.round(nodeIdMap[nodeId].averageRssi);
      let total = stats.received + stats.lost;
      let loss = stats.lost / total;

      if (rssiMap[rssi] === undefined) {
        rssiMap[rssi] = [];
      }
      rssiMap[rssi].push((100*loss).toFixed(2))
    }
  }

  let rssiValues = Object.keys(rssiMap).sort();
  for (let value of rssiValues) {
    console.log("Rssi:", value, "Loss:", rssiMap[value], '%')
  }
}

run()