function parseStatistics(sim) {
  // group nodes (type Crownstone) into hop layers from the hub.
  let topology = sim.topology;

  let hubAddress = getHub(topology);
  // get hop levels
  let hopMap = getHopMap(topology, hubAddress);


  let macAddressMap = {}
  for (let node of topology.nodes) {
    macAddressMap[node.macAddress] = node.crownstoneId
  }

  let totalAdvertisementsSent   = 0;
  let totalMessagesSent         = 0;
  let totalMessagesOverMesh     = 0;
  let totalMessagesRelayed      = 0;
  let totalMessagesDuplicate    = 0;
  let totalMessagesDroppedQueue = 0;
  let totalMessageRelaysBlocked = 0;

  let statistics = sim.report();
  let hopCount = 0;
  let hopAverages = {};
  for (let items of hopMap) {
    if (items.length > 0) { hopAverages[hopCount] = [] };
    for (let nodeAddress of items) {
      let loss = (100-getSuccessRate(statistics, hubAddress, nodeAddress)*100);
      hopAverages[hopCount].push(loss);
      console.log(
        "Distance:",hopCount,
        "CrownstoneId:", macAddressMap[nodeAddress],
        "Loss:", loss.toFixed(2),"%"
      );
    }
    hopCount++;
  }

  for (let hopCount in hopAverages) {
    let sum = 0;
    for (let value of hopAverages[hopCount]) {
      sum += value
    }
    console.log(
      "Distance:",hopCount,
      "Average Loss:", (sum/hopAverages[hopCount].length).toFixed(2),"%"
    );
  }

  for (let nodeAddress in statistics) {
    let stats = statistics[nodeAddress];
    totalAdvertisementsSent += stats.advertisements.sent.unique;
    totalMessagesSent += stats.meshBroadcasts.sent.unique;
    totalMessagesRelayed += stats.meshBroadcasts.relayed.unique;
    totalMessagesDuplicate += stats.meshBroadcasts.sentDuplicates.count;
    totalMessagesDroppedQueue += stats.meshBroadcasts.queueOverflow.count;
    totalMessageRelaysBlocked += stats.meshBroadcasts.blocked.count;
    totalMessagesOverMesh += stats.meshBroadcasts.sent.unique + stats.meshBroadcasts.relayed.unique;
  }

  console.log("Total messages over mesh:          ", totalMessagesOverMesh);
  console.log("Total messages sent:               ", totalMessagesSent);
  console.log("Total messages relayed:            ", totalMessagesRelayed);
  console.log("Total messages relayed for nothing:", totalMessagesDuplicate);
  console.log("Total messages dropped by queue:   ", totalMessagesDroppedQueue);
  console.log("Total message relays blocked:      ", totalMessageRelaysBlocked);
  console.log("Total advertisements sent:         ", totalAdvertisementsSent);
}

module.exports = parseStatistics;


function getSuccessRate(statistics, hubAddress, nodeAddress) {
  let hubStats = statistics[hubAddress];
  if (hubStats.meshBroadcasts.received.senders[nodeAddress]) {
    return hubStats.assetTrackingPropagation.senders[nodeAddress].count / hubStats.assetTrackingPropagation.senders[nodeAddress].outOf
  }
  return -1
}

function getHub(topology) {
  for (let node of topology.nodes) {
    if (node.type === "HUB") {
      return node.macAddress;
    }
  }
  return null;
}

function getHopMap(topology, address) {
  let nodesToFind = [];
  let macMap = {}

  for (let node of topology.nodes) {
    if (node.type === "CROWNSTONE") {
      nodesToFind.push(node);
    }
    macMap[node.macAddress] = node.crownstoneId
  }

  let map = {};

  let connections = topology.connections;
  let connectionMap = {};

  for (let connection of connections) {
    if (!macMap[connection.to] || !macMap[connection.from]) { continue; }
    if (connectionMap[connection.from] === undefined) {
      connectionMap[connection.from] = [];
    }
    if (connectionMap[connection.to] === undefined) {
      connectionMap[connection.to] = [];
    }

    connectionMap[connection.from].push(connection.to);
    connectionMap[connection.to].push(connection.from);
  }

  function step(from, target, history, depth) {
    history[from] = true;
    let shortestPath = 1e8
    for (let to of connectionMap[from]) {
      // already been here
      if (history[to]) { continue; }

      if (to === target) {
        return {success:true, depth: depth+1};
      }

      let result = step(to, target, {...history}, depth+1);
      if (result.success) {
        shortestPath = Math.min(result.depth, shortestPath);
      }
    }
    return {success: shortestPath !== 1e8, depth:shortestPath}
  }

  for (let node of nodesToFind) {
    let history = {};
    let result = step(node.macAddress, address, history, 0)
    if (result.success) {
      if (map[result.depth] === undefined) {
        map[result.depth] = [];
      }
      map[result.depth].push(node.macAddress);
    }
  }

  let result = []
  let depthList = Object.keys(map);
  depthList.sort();
  let index = 0;
  let hits = 0;
  while (hits < depthList.length) {
    if (map[index] !== undefined) {
      result.push(map[index])
      hits++;
    }
    else {
      result.push([]);
    }
    index++;
  }

  return result;
}

