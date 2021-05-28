let VIS_CONTAINER;
let TOKEN_INPUT_WRAPPER;
let CONNECTED_STATE;
let GRAPH_WRAPPER;
let SIM_OVERLAY;
let DETAIL;

let NODES_DATASET = new vis.DataSet();
let EDGES_DATASET = new vis.DataSet();
let NETWORK;
let LOCATION_DATA = {};
let SHOWING_NODE = null;
let COMPARE_NODE = null;

let UNMODIFIED_DATA = [];


const optionsKey = "VISJS_NETWORK_OPTIONS_OVERRIDE";

let GROUP_COLORS = [
  colors.csBlue,
  colors.csOrange,
  colors.purple,
  colors.blue,
  colors.darkGreen,
  colors.red,
  colors.iosBlue,
  colors.lightBlue2,
  colors.blinkColor1,
  colors.csBlueLight,
  colors.darkPurple,
  colors.blue3,
  colors.darkRed,
];

let CROWNSTONE_ID = 1;
let ASSET_ID = 500;

function initDOM() {
  GRAPH_WRAPPER         = document.getElementById("networkContainer");
  CONNECTED_STATE       = document.getElementById("connectedState");
  DETAIL                = document.getElementById("detail");
  VIS_CONTAINER         = document.getElementById("meshTopology")
  SIM_OVERLAY           = document.getElementById("simulatingOverlay")

  EVENTBUS.on("Connected", () => {
    CONNECTED_STATE.innerHTML = "Connected!";
    CLIENT.send({type:"GET_TOPOLOGY"})
  })
  EVENTBUS.on("Disconnected", () => { CONNECTED_STATE.innerHTML = "Disconnected..."})
  EVENTBUS.on("Message", (data) => {
    if (data.type === "TOPOLOGY") {
      loadTopology(data.data);
    }
    else if (data.type === "STATISTICS") {
      SIM_OVERLAY.style.display = "none";
      loadStatistics(data.data);
      NETWORK.selectNodes([UNMODIFIED_DATA.nodes[0].id]);
      showNodeStatistics(NODES_DATASET.get()[0]);
    }
    else if (data.type === "START_SIMULATION") {
      SIM_OVERLAY.style.display = "block";
    }
  })
  initVis();
}

function initVis() {
  // create a dataSet with groups
  let customOptions = window.localStorage.getItem(optionsKey);
  if (customOptions === null) {
    customOptions = {};
  }
  else {
    try {
      customOptions = JSON.parse(customOptions);
    }
    catch (err) {
      window.localStorage.removeItem(optionsKey);
      customOptions = {};
    }
  }
  var options = {
    nodes: {
      shape: "dot",
    },
    configure: {
      filter: function (option, path) {
        if (path.indexOf("physics") !== -1) {
          return true;
        }
        if (path.indexOf("smooth") !== -1 || option === "smooth") {
          return true;
        }
        return false;
      },
      container: document.getElementById("config"),
    },
    edges: {
      smooth: {
        forceDirection: 'none'
      }
    },
    physics: {
      stabilization: true,
      barnesHut: {
        gravitationalConstant: -10000,
        springLength: 130,
        springConstant: 0.02
      },
      minVelocity: 0.75
    },
  };

  vis.util.deepExtend(options, customOptions);
  NETWORK = new vis.Network(VIS_CONTAINER, {nodes: NODES_DATASET, edges: EDGES_DATASET}, options);
  // NETWORK = new vis.Network(VIS_CONTAINER,  getScaleFreeNetwork(25), options);

  NETWORK.on("click", (data) => {
    if (data.nodes.length == 0 && data.edges.length > 0) {
      // show edge
      let edgeData = EDGES_DATASET.get(data.edges[0])
      DETAIL.innerHTML = JSON.stringify({
        ...edgeData.data, lastSeen: new Date(edgeData.data.lastSeen).toLocaleTimeString()
      }, undefined, 2);
      NODES_DATASET.update(UNMODIFIED_DATA);
    }
    else if (data.nodes.length == 0 && data.edges.length == 0) {
      DETAIL.innerHTML = '';
      console.log(UNMODIFIED_DATA)
      NODES_DATASET.update(UNMODIFIED_DATA.nodes);
      EDGES_DATASET.clear();
      EDGES_DATASET.add(UNMODIFIED_DATA.edges);
      SHOWING_NODE = null;
      COMPARE_NODE = null;
    }
    else {
      let nodeData = NODES_DATASET.get(data.nodes[0])
      if (SHOWING_NODE && SHOWING_NODE.id !== nodeData.id) {
        if (COMPARE_NODE && COMPARE_NODE.id === nodeData.id) {
          // deselect the compare node.
          NETWORK.selectNodes([SHOWING_NODE.id]);
          COMPARE_NODE = null;
          showNodeStatistics(SHOWING_NODE);
          return;
        }


        NETWORK.selectNodes([SHOWING_NODE.id, nodeData.id])
        showNodePath(nodeData);
      }
      else {
        // show node summary
        showNodeStatistics(nodeData);
      }
    }
  })


  NETWORK.on("configChange", (options) => {
    let baseOptions = NETWORK.getOptionsFromConfigurator();
    vis.util.deepExtend(baseOptions, options);
    window.localStorage.setItem(optionsKey, JSON.stringify(baseOptions));
  })
}


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
  let nodeUpdates = {}

  for (let senderId in receivedMeshMessages) {
    let d = receivedMeshMessages[senderId];
    if (d.outOf === 0) {
      nodeUpdates[senderId] = `0 % \n${d.count} out of ${d.outOf}`;
    }
    else {
      nodeUpdates[senderId] = `${((d.count / d.outOf)*100).toFixed(2)} % \n${d.count} out of ${d.outOf}`;
    }
  }

  let nodeDetails = NODES_DATASET.get();
  for (let nodeItem of nodeDetails) {
    for (let nodeId in nodeUpdates) {
      if (nodeItem.id === nodeId) {
        nodeItem.label = nodeUpdates[nodeId] + "\nCrownstoneId:" + nodeItem.crownstoneId;
        break;
      }
    }
    // this is the node that we clicked on
    if (nodeItem.id === nodeData.id) {
      nodeItem.label = `${nodeData.crownstoneId} - Details in top left corner.`
    }
  }

  NODES_DATASET.update(nodeDetails);

  DETAIL.innerHTML = `<table>` +
    `<tr><td>advertisements sent:</td><td colspan="2">${statistics.advertisements.sent.unique}</td></tr>` +
    `<tr><td colspan="3"><b>advertisements received:</b></td>` + columns +
    `<tr><td colspan="3"><b>Mesh usage:</b></td>` +
    `<tr><td>mesh broadcasts sent:</td><td colspan="2">${statistics.meshBroadcasts.sent.unique}</td></tr>` +
    `<tr><td>mesh broadcasts relayed:</td><td colspan="2">${statistics.meshBroadcasts.relayed.unique}</td></tr>` +
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
  
  let edges = UNMODIFIED_DATA.edges;
  function findEdge(a,b) {
    for (let edge of edges) {
      if (edge.from === a && edge.to === b) {
        return edge;
      }
      if (edge.to === a && edge.from === b) {
        return edge;
      }
    }
  }

  let edgeMap = {};
  for (let edge of edges) {
    edge = {...edge, color: 'rgba(0,0,0,0.25)'}
    edgeMap[edge.id] = edge;
  }
  let nodes = []
  for (let node of UNMODIFIED_DATA.nodes) {
    if (node.id !== SHOWING_NODE.id && node.id !== otherNode.id) {
      nodes.push({...node, color: 'rgb(200,200,200)'})
    }
  }

  let edgeIds = [];
  for (let path of paths) {
    let arr = path.split("__");
    let ratio = pathData[path].count / total;
    for (let i = 1; i < arr.length; i++) {
      let edge = findEdge(arr[i-1],arr[i]);
      let arrow = {arrows: {}}
      if (edge.to === arr[i]) {
        arrow.arrows.to = true;
      }
      else {
        arrow.arrows.from = true;
      }

      edge = {...edge, ...getEdgeSettings(ratio, (100*ratio).toFixed(2) + " %", 0, 1), ...arrow}
      edgeMap[edge.id] = edge;
      edgeIds.push(edge.id);

    }
  }
  NETWORK.selectEdges(edgeIds);
  EDGES_DATASET.update(Object.values(edgeMap))
  NODES_DATASET.update(nodes)
}

function loadTopology(data) {
  let nodes = [];
  let edges = [];


  let shapeMap = {
    ASSET:      'diamond',
    HUB:        'star',
    CROWNSTONE: 'dot'
  }
  let massMap = {
    ASSET:      1,
    HUB:        5,
    CROWNSTONE: 2,
  }

  let nodeMap = {};
  let nodeMapSeeAssets = {};
  for (let node of data.nodes) {
    nodeMap[node.id] = node.type;
  }

  for (let edge of data.edges) {
    edges.push(edge);
    if (nodeMap[edge.from] === "ASSET" && nodeMap[edge.to] !== "ASSET") {
      if (nodeMapSeeAssets[edge.to] === undefined) { nodeMapSeeAssets[edge.to] = 0; }
      nodeMapSeeAssets[edge.to]++;
    }
    if (nodeMap[edge.to] === "ASSET" && nodeMap[edge.from] !== "ASSET") {
      if (nodeMapSeeAssets[edge.from] === undefined) { nodeMapSeeAssets[edge.from] = 0; }
      nodeMapSeeAssets[edge.from]++;
    }
  }

  for (let node of data.nodes) {
    if (node.type !== 'ASSET') {
      let visibleAssets = nodeMapSeeAssets[node.id];
      if (visibleAssets > 0) {
        nodes.push({id: node.id, label: node.cid+":["+visibleAssets+"]", crownstoneId: node.cid, visibleAssets, group: node.type + ':' + visibleAssets, shape: shapeMap[node.type], mass: massMap[node.type]})
      }
      else {
        nodes.push({id: node.id, label: node.cid+": No assets in range", crownstoneId: node.cid, visibleAssets, group: node.type, shape: shapeMap[node.type], mass: massMap[node.type]})
      }
    }
  }

  NODES_DATASET.clear();
  EDGES_DATASET.clear();
  NODES_DATASET.add(nodes);
  EDGES_DATASET.add(edges);
  NETWORK.stabilize(300)
  UNMODIFIED_DATA = {nodes: nodes, edges: edges};
}


function loadStatistics(data) {
  console.log("Statistics", data)
  let nodes = NODES_DATASET.get();
  for (let node of nodes) {
    node.statistics = data[node.id]
  }
  UNMODIFIED_DATA.nodes = nodes;
  NODES_DATASET.update(nodes)
}



function getEdgeSettings(ratio, label, rangeMin, rangeMax) {
  // item list for the 6 different phases. They fade to each other.
  let range = (rangeMax - rangeMin)
  let bounds = [];
  for (let i = 1; i < 5; i++) {
    bounds.push((range/5)*i);
  }
  bounds.reverse();

  let baseWidth = 10;
  if (ratio > bounds[0]) {
    return {color: colors.green.hex, width: baseWidth, label: label}
  }
  else if (ratio > bounds[1]) {
    let factor = 1-Math.abs((ratio - bounds[0])/(bounds[0]-bounds[1]));
    return {color: colors.green.blend(colors.blue2, 1-factor).hex, width: baseWidth*0.4 + baseWidth*0.6*factor, label: label}
  }
  else if (ratio > bounds[2]) {
    let factor = 1-Math.abs((ratio - bounds[1])/(bounds[1]-bounds[2]));
    return {color: colors.blue2.blend(colors.purple, 1-factor).hex, width: baseWidth*0.4*0.4 + baseWidth*0.4*0.6*factor, label: label}
  }
  else if (ratio > bounds[3]) {
    let factor = 1-Math.abs((ratio - bounds[2])/(bounds[2]-bounds[3]));
    return {color: colors.purple.blend(colors.red, 1-factor).hex, width: baseWidth*0.4*0.4, label: label}

  }
  else {
    return {color: colors.darkRed.hex, width: baseWidth*0.4*0.4, opacity: 0.6, dashArray:"8, 12", label: label}
  }
}

// function getEdgeSettings(rssi) {
//   let label = rssi;
//   // item list for the 6 different phases. They fade to each other.
//   let bounds = [-70, -76, -83, -92];
//
//   let baseWidth = 10;
//   if (rssi > bounds[0]) {
//     // 0 .. -59
//     return {color: colors.green.hex, width: baseWidth, label: label}
//   }
//   else if (rssi > bounds[1]) {
//     // -60 .. -69
//     let factor = 1-Math.abs((rssi - bounds[0])/(bounds[0]-bounds[1]));
//     return {color: colors.green.blend(colors.blue2, 1-factor).hex, width: baseWidth*0.4 + baseWidth*0.6*factor, label: label}
//   }
//   else if (rssi > bounds[2]) {
//     // -70 .. -79
//     let factor = 1-Math.abs((rssi - bounds[1])/(bounds[1]-bounds[2]));
//     return {color: colors.blue2.blend(colors.purple, 1-factor).hex, width: baseWidth*0.4*0.4 + baseWidth*0.4*0.6*factor, label: label}
//   }
//   else if (rssi > bounds[3]) {
//     let factor = 1-Math.abs((rssi - bounds[2])/(bounds[2]-bounds[3]));
//     // -81 .. -85
//     return {color: colors.purple.blend(colors.red, 1-factor).hex, width: baseWidth*0.4*0.4, label: label}
//
//   }
//   else {
//     // -95 .. -120
//     return {color: colors.darkRed.hex, width: baseWidth*0.4*0.4, opacity: 0.6, dashArray:"8, 12", label: label}
//   }
// }


function addHub() {
  NODES_DATASET.add({id: CROWNSTONE_ID, label:"Hub:" + CROWNSTONE_ID, type:"HUB", group:"hubs", shape: 'star'});
  CROWNSTONE_ID++;
}

function addCrownstone() {
  NODES_DATASET.add({id: CROWNSTONE_ID, label:"Stone:" + CROWNSTONE_ID, type:"CROWNSTONE", group:"stones",shape: 'dot'});
  CROWNSTONE_ID++;
}

function addAsset() {
  NODES_DATASET.add({id: ASSET_ID, label:"Asset:" + ASSET_ID, type:"ASSET", shape: 'diamond', group:"assets"});
  ASSET_ID++;
}

function randomTopology() {
  let nodes = NODES_DATASET.get();
  let edges = [];
  for (let node of nodes) {
    let map = {};
    let connections = Math.floor(1+Math.random()*4);
    for (let i = 0; i < connections; i++) {
      let index = Math.floor(Math.random()*nodes.length);
      if (nodes[index].id !== node.id && map[index] !== true) {
        edges.push({from: node.id, to: nodes[index].id})
      }
    }
  }
  EDGES_DATASET.clear()
  EDGES_DATASET.add(edges)
}

function runSimulation(seconds) {
  SIM_OVERLAY.style.display = "block";
  CLIENT.send({
    type:"RUN_SIMULATION",
    data: seconds
  })
}