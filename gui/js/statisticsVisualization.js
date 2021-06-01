
/**
 *
 interface StatisticsData {
  [macAddress:string] : {
    type: string,
    crownstoneId: string,
    advertisements: {
      sent: { unique: number, count: number, receivers: StatisticsSuccessRate },
      received: { senders: StatisticsReceiveRate },
    },
    meshBroadcasts: {
      sent:    { unique: number, count: number, receivers: StatisticsSuccessRate},
      relayed: { unique: number, count: number, receivers: StatisticsSuccessRate},

      received: { senders: StatisticsReceiveRate}
      sentDuplicates: { count: number, receivers: StatisticsDuplicateRate},
      blocked: { receivers: StatisticsSuccessRate}
    }
  }
}

 interface StatisticsSuccessRate {
  [macAddress:string] : {
    successCount: number,
    failCount: number,
  }
}
 interface StatisticsReceiveRate {
  [macAddress:string] : {
    count: number,
    outOf: number,
  }
}
 interface StatisticsDuplicateRate {
  [macAddress:string] : number
}
 * @param nodeData
 */
function showNodeStatistics(nodeData) {
  console.log("SHOWING DATA FROM", nodeData)

  SHOWING_NODE = nodeData;
  /** received advertisements:
   *    mac, x out of y (percentage)
   *  sent mesh broadcasts: number (unique)
   *  receiving rates have been marked by the other crownstones.
   *  relayed mesh messages: number (unique)
   *
   */
  NODES_DATASET.update(UNMODIFIED_DATA.nodes);
  EDGES_DATASET.update(UNMODIFIED_DATA.edges);
  let statistics = nodeData.statistics;
  if (!statistics) {
    DETAIL.innerHTML = "No statistics data available on this node."
    return;
  }

  let receivedAdvertisements = statistics.advertisements.received.senders;
  let columns = '';
  for (let senderId in receivedAdvertisements) {
    let d = receivedAdvertisements[senderId];
    columns += `<tr><td>${senderId}</td><td>${d.count} / ${d.outOf}</td><td style="width:100px"><b><i>${((d.count / d.outOf)*100).toFixed(2)} %</i></b></td></tr>`
  }

  let receivedMeshMessages = statistics.meshBroadcasts.received.senders;
  if (SHOW_ASSET_PERCENTAGES) {
    receivedMeshMessages = statistics.assetTrackingPropagation.senders;
  }
  let nodeUpdates = {}

  for (let senderId in receivedMeshMessages) {
    let d = receivedMeshMessages[senderId];
    let node = NODES_DATASET.get(senderId);
    if (!node) { continue; }

    if (d.outOf === 0) {
      nodeUpdates[senderId] = {label:`0 % \n${d.count} out of ${d.outOf}\nCrownstoneId:${node.crownstoneId}`, color: '#ddd' };
    }
    else {
      nodeUpdates[senderId] = {
        label:`${((d.count / d.outOf)*100).toFixed(2)} % \n${d.count} out of ${d.outOf}\nCrownstoneId:${node.crownstoneId}`,
        color: getEdgeSettings(d.count / d.outOf, '', -0.2, 0.8).color
      };
    }
  }

  let nodeDetails = NODES_DATASET.get();
  let updatedNodes = [];
  for (let nodeItem of nodeDetails) {
    for (let nodeId in nodeUpdates) {
      if (nodeItem.id === nodeId) {
        updatedNodes.push({...nodeItem, ...nodeUpdates[nodeId]});
        break;
      }
    }
    // this is the node that we clicked on
    if (nodeItem.id === nodeData.id) {
      updatedNodes.push({...nodeItem, size: 50, label: `${nodeData.crownstoneId} - Details in bottom left corner.`})
    }
  }

  NODES_DATASET.update(updatedNodes);

  DETAIL.innerHTML = `<table>` +
    `<tr><td>advertisements sent:</td><td colspan="2">${statistics.advertisements.sent.unique}</td></tr>` +
    `<tr><td colspan="3"><b>advertisements received:</b></td>` + columns +
    `<tr><td colspan="3"><b>Mesh usage:</b></td>` +
    `<tr><td>mesh broadcasts sent:</td><td colspan="2">${statistics.meshBroadcasts.sent.unique}</td></tr>` +
    `<tr><td>mesh broadcasts relayed:</td><td colspan="2">${statistics.meshBroadcasts.relayed.unique}</td></tr>` +
    `<tr><td>mesh queue overflow:</td><td colspan="2">${statistics.meshBroadcasts.queueOverflow.count}</td></tr>` +
    `<tr><td>mesh unneccesary duplicates sent:</td><td colspan="2">${statistics.meshBroadcasts.sentDuplicates.count}</td></tr>`


}


function showNodePath(otherNode) {
  COMPARE_NODE = otherNode;

  let statistics = SHOWING_NODE.statistics;
  if (!statistics) { return }
  let meshRecevied = statistics.meshBroadcasts.received.senders[otherNode.id]
  let total = meshRecevied.count;
  let pathData = meshRecevied.paths;
  let paths = Object.keys(pathData);

  let edges = EDGES_DATASET.get();
  function findEdge(a,b) {
    for (let edge of edges) {
      if (edge.from === a && edge.to === b) {
        return {...edge};
      }
      if (edge.to === a && edge.from === b) {
        return {...edge};
      }
    }
  }

  let edgeMap = {};
  for (let edge of edges) {
    edge = {...edge, color: 'rgba(0,0,0,0.25)', label: ''}
    edgeMap[edge.id] = edge;
  }
  let nodes = [];
  let nodeIdMap = {}
  for (let node of UNMODIFIED_DATA.nodes) {
    nodeIdMap[node.id] = node.crownstoneId;
    let alteredNode = {...node, fixed: true}
    if (node.id !== SHOWING_NODE.id && node.id !== COMPARE_NODE.id) {
      nodes.push({...alteredNode, color: '#ddd'})
    }
    else {
      nodes.push(alteredNode)
    }
  }

  let edgesModified = {};
  for (let path of paths) {
    let arr = path.split("__");
    let ratio = pathData[path].count / total;
    for (let i = 1; i < arr.length; i++) {
      let edge = findEdge(arr[i-1],arr[i]);
      if (!edge) { continue; }

      let arrow = {arrows: {}}
      if (edge.to === arr[i]) {
        arrow.arrows.to = true;
      }
      else {
        arrow.arrows.from = true;
      }


      // this will draw a set of edges for each path;
      if (INDIVIDUAL_PATH_VISUALIZATION) {
        let newEdge = {...edge, ...getEdgeSettings(ratio, (100 * ratio).toFixed(2) + " %", 0, 1), ...arrow};
        if (edgesModified[edge.id] === undefined) {
          edge = newEdge;
          edgesModified[edge.id] = true;
          edgeMap[edge.id] = edge;
        }
        else {
          newEdge.id = Math.floor(Math.random() * 1e9).toString(36);
          edgeMap[newEdge.id] = newEdge;
        }
      }
      else {
        if (edgesModified[edge.id] === undefined) {
          edgesModified[edge.id] = ratio;
        }
        else {
          edgesModified[edge.id] += ratio;
        }
        let usedRatio = edgesModified[edge.id]
        edge = {...edge, ...getEdgeSettings(usedRatio, (100 * usedRatio).toFixed(2) + " %", 0, 1), ...arrow};
        edgeMap[edge.id] = edge;
      }

    }
  }
  EDGES_DATASET.update(Object.values(edgeMap))
  NODES_DATASET.update(nodes)
  NETWORK.selectEdges(Object.keys(edgeMap));
}