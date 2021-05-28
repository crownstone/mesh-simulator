let VIS_CONTAINER;
let TOKEN_INPUT_WRAPPER;
let CONNECTED_STATE;
let GRAPH_WRAPPER;
let SIM_OVERLAY;
let DETAIL;
let SHOW_ASSETS = false;

let TMP_ASSET_STORE = [];
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

      console.log("selecting", [UNMODIFIED_DATA.nodes[0].id], NODES_DATASET.get()[0])
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

  EDGES_DATASET.on('add', (event, properties, senderId) => {
    if (properties.items.length === 1) {
      let edge = {...EDGES_DATASET.get(properties.items[0])};
      let fromNode = NODES_DATASET.get(edge.from);
      let toNode   = NODES_DATASET.get(edge.to);
      console.log(edge, fromNode, toNode)
      if (fromNode.group === 'ASSET' || toNode.group === "ASSET") {
        edge.physics = false;
        EDGES_DATASET.update(edge)
      }

      UNMODIFIED_DATA.edges.push(edge);
      updateTopology()
    }
  })

  NETWORK.on("click", (data) => {
    if (data.nodes.length == 1) {
      let nodeData = NODES_DATASET.get(data.nodes[0])
      if (SHOWING_NODE && SHOWING_NODE.id !== nodeData.id) {
        if (COMPARE_NODE && COMPARE_NODE.id === nodeData.id) {
          // deselect the compare node.
          NETWORK.selectNodes([SHOWING_NODE.id]);
          NODES_DATASET.update(UNMODIFIED_DATA.nodes);
          EDGES_DATASET.update(UNMODIFIED_DATA.edges);
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
    else {
      DETAIL.innerHTML = '';
      console.log(UNMODIFIED_DATA)
      NODES_DATASET.update(UNMODIFIED_DATA.nodes);
      EDGES_DATASET.clear();
      EDGES_DATASET.add(UNMODIFIED_DATA.edges);
      SHOWING_NODE = null;
      COMPARE_NODE = null;
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
      nodeItem.label = `${nodeData.crownstoneId} - Details in bottom left corner.`
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
  
  let edges = EDGES_DATASET.get();
  console.log(edges, UNMODIFIED_DATA.edges)
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
      if (!edge) { continue; }

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
    ASSET:      5,
    HUB:        5,
    CROWNSTONE: 2,
  }

  let nodeMap = {};
  let nodeMapSeeAssets = {};
  for (let node of data.nodes) {
    nodeMap[node.id] = node.type;
  }

  TMP_ASSET_STORE = []

  for (let edge of data.edges) {
    edges.push({...edge, ...getEdgeSettingsRssi(edge.rssi)});
    if (nodeMap[edge.from] === "ASSET" && nodeMap[edge.to] !== "ASSET") {
      if (nodeMapSeeAssets[edge.to] === undefined) { nodeMapSeeAssets[edge.to] = 0; }
      nodeMapSeeAssets[edge.to]++;
      edge.physics = false;
    }
    if (nodeMap[edge.to] === "ASSET" && nodeMap[edge.from] !== "ASSET") {
      if (nodeMapSeeAssets[edge.from] === undefined) { nodeMapSeeAssets[edge.from] = 0; }
      nodeMapSeeAssets[edge.from]++;
      edge.physics = false;

      // turn them around so the edge always points from asset to crownstone
      let tmp = edge.from;
      edge.from = edge.to;
      edge.to = tmp;
    }
  }

  for (let node of data.nodes) {
    if (node.type !== 'ASSET') {
      let visibleAssets = nodeMapSeeAssets[node.id];
      if (visibleAssets > 0) {
        nodes.push({id: node.id, label: node.cid+":["+visibleAssets+"]",  type: node.type, crownstoneId: node.cid, visibleAssets, group: node.type + ':' + visibleAssets, shape: shapeMap[node.type], mass: massMap[node.type]})
      }
      else {
        nodes.push({id: node.id, label: node.cid+": No assets in range",  type: node.type, crownstoneId: node.cid, visibleAssets, group: node.type + ':0', shape: shapeMap[node.type], mass: massMap[node.type]})
      }
    }
    else {
      let assetNode = {id: node.id, label: "Asset", crownstoneId: "Asset", intervalMs: node.intervalMs, type: node.type, group: node.type, shape: shapeMap[node.type], mass: massMap[node.type], fixed: true};
      if (SHOW_ASSETS === false) {
        TMP_ASSET_STORE.push(assetNode)
      }
      else {
        nodes.push(assetNode);
      }
    }
  }

  NODES_DATASET.clear();
  EDGES_DATASET.clear();
  NODES_DATASET.add(nodes);
  EDGES_DATASET.add(edges);
  NETWORK.stabilize(300)

  let loadedEdges = EDGES_DATASET.get();
  UNMODIFIED_DATA = {nodes: nodes, edges: []};
  for (let edge of loadedEdges) {
    UNMODIFIED_DATA.edges.push({...edge})
  }
}


function loadStatistics(data) {
  console.log("Statistics", data)
  let nodes = NODES_DATASET.get();
  for (let node of nodes) {
    node.statistics = data[node.id]
  }
  NODES_DATASET.update(nodes)

  for (let node of UNMODIFIED_DATA.nodes) {
    node.statistics = data[node.id]
  }
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


function updateTopology() {
  let nodes = [];
  let edges = [];
  let assets = [];

  for (let node of UNMODIFIED_DATA.nodes) {
    nodes.push({id: node.id, macAddress: node.id, crownstoneId: node.crownstoneId, type: node.type})
  }
  for (let asset of TMP_ASSET_STORE) {
    assets.push({id: asset.id, macAddress: asset.id, intervalMs: asset.intervalMs, type: asset.type})
  }
  if (assets.length === 0) {
    let nodes = NODES_DATASET.get();
    for (let node of nodes) {
      if (node.type === "ASSET") {
        assets.push({id: node.id, macAddress: node.id, intervalMs: node.intervalMs, type: node.type})
      }
    }
  }
  for (let edge of UNMODIFIED_DATA.edges) {
    edges.push({from: edge.from, to: edge.to, rssi: edge.rssi});
  }

  CLIENT.send({
    type:"UPDATE_TOPOLOGY",
    data: {
      nodes: nodes,
      assets: assets,
      connections: edges,
    }
  })
}

function getEdgeSettingsRssi(rssi = -80) {
  if (typeof rssi ==='object') {
    let average  = 0;
    let avgCount = 0;
    if (rssi['37'] !== 0) { average += rssi['37']; avgCount += 1; }
    if (rssi['38'] !== 0) { average += rssi['38']; avgCount += 1; }
    if (rssi['39'] !== 0) { average += rssi['39']; avgCount += 1; }
    rssi = Math.round(average/avgCount);
  }

  let label = rssi;
  // item list for the 6 different phases. They fade to each other.
  let bounds = [-70, -76, -83, -92];

  let baseWidth = 10;
  if (rssi > bounds[0]) {
    // 0 .. -59
    return {color: colors.green.hex, width: baseWidth, label: label}
  }
  else if (rssi > bounds[1]) {
    // -60 .. -69
    let factor = 1-Math.abs((rssi - bounds[0])/(bounds[0]-bounds[1]));
    return {color: colors.green.blend(colors.blue2, 1-factor).hex, width: baseWidth*0.4 + baseWidth*0.6*factor, label: label}
  }
  else if (rssi > bounds[2]) {
    // -70 .. -79
    let factor = 1-Math.abs((rssi - bounds[1])/(bounds[1]-bounds[2]));
    return {color: colors.blue2.blend(colors.purple, 1-factor).hex, width: baseWidth*0.4*0.4 + baseWidth*0.4*0.6*factor, label: label}
  }
  else if (rssi > bounds[3]) {
    let factor = 1-Math.abs((rssi - bounds[2])/(bounds[2]-bounds[3]));
    // -81 .. -85
    return {color: colors.purple.blend(colors.red, 1-factor).hex, width: baseWidth*0.4*0.4, label: label}

  }
  else {
    // -95 .. -120
    return {color: colors.darkRed.hex, width: baseWidth*0.4*0.4, opacity: 0.6, dashArray:"8, 12", label: label}
  }
}



function addCrownstone() {
  let id = 0;
  for (let node of UNMODIFIED_DATA.nodes) {
    if (node.type !== "ASSET") {
      id = Math.max(id, Number(node.crownstoneId));
    }
  }
  id += 1;
  let newNode = {id: getMacAddress(), crownstoneId: id, label:id+ ": No assets in range", type:"CROWNSTONE", group:"CROWNSTONE:0", shape: 'dot'};
  UNMODIFIED_DATA.nodes.push(newNode)
  NODES_DATASET.add(newNode);
}

function addEdge() {
  NETWORK.addEdgeMode()
}

function deleteSelected() {
  let selectedEdges = NETWORK.getSelectedEdges();
  let selectedNodes = NETWORK.getSelectedNodes();

  for (let i = UNMODIFIED_DATA.nodes.length - 1; i >= 0; i--) {
    if (selectedNodes.indexOf(UNMODIFIED_DATA.nodes[i].id) !== -1) {
      UNMODIFIED_DATA.nodes.splice(i,1);
    }
  }
  for (let i = UNMODIFIED_DATA.edges.length - 1; i >= 0; i--) {
    if (selectedEdges.indexOf(UNMODIFIED_DATA.edges[i].id) !== -1) {
      UNMODIFIED_DATA.edges.splice(i,1);
    }
  }
  updateTopology()
}

function toggleAssets() {
  SHOW_ASSETS = !SHOW_ASSETS;

  if (SHOW_ASSETS) {
    NODES_DATASET.add(TMP_ASSET_STORE);
    TMP_ASSET_STORE = [];
  }
  else {
    TMP_ASSET_STORE = [];
    let nodes = NODES_DATASET.get();
    for (let node of nodes) {
      if (node.type === "ASSET") {
        TMP_ASSET_STORE.push(node);
      }
    }
    NODES_DATASET.remove(TMP_ASSET_STORE)
  }
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