

let SHOW_ASSET_PERCENTAGES = true;
let IGNORE_ADD_EVENT = false;

let INDIVIDUAL_PATH_VISUALIZATION = true;
let SHOW_ASSETS = false;

let TMP_ASSET_STORE = [];
let NODES_DATASET = new vis.DataSet();
let EDGES_DATASET = new vis.DataSet();
let NETWORK;
let LOCATION_DATA = {};
let SHOWING_NODE = null;
let COMPARE_NODE = null;

let UNMODIFIED_DATA = [];
let DRAG_FIXED_CACHE = false;

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
    layout: {
      randomSeed: 221,
    },
    physics: {
      stabilization: true,
      barnesHut: {
        gravitationalConstant: -10000,
        springLength: 130,
        springConstant: 0.02
      },
      minVelocity: 0.75,
    },
  };

  vis.util.deepExtend(options, customOptions);
  NETWORK = new vis.Network(VIS_CONTAINER, {nodes: NODES_DATASET, edges: EDGES_DATASET}, options);
  // NETWORK = new vis.Network(VIS_CONTAINER,  getScaleFreeNetwork(25), options);

  EDGES_DATASET.on('add', (event, properties, senderId) => {
    if (IGNORE_ADD_EVENT) { return; }

    if (properties.items.length === 1) {
      let edge = {...EDGES_DATASET.get(properties.items[0])};
      let fromNode = NODES_DATASET.get(edge.from);
      let toNode   = NODES_DATASET.get(edge.to);
      if (fromNode.group === 'ASSET' || toNode.group === "ASSET") {
        edge.physics = false;
        EDGES_DATASET.update(edge)
      }

      UNMODIFIED_DATA.edges.push(edge);
      updateTopology()
    }
  })

  NETWORK.on("dragStart", (data) => {
    if (data.nodes.length === 1) {
      let node = NODES_DATASET.get(data.nodes[0]);
      DRAG_FIXED_CACHE = node.fixed;
      if (node.fixed) {
        node.fixed = false
        NODES_DATASET.update(node);
      }
    }
  })
  NETWORK.on("dragEnd", (data) => {
    if (data.nodes.length === 1) {
      let node = NODES_DATASET.get(data.nodes[0]);
      if (node.fixed !== DRAG_FIXED_CACHE) {
        node.fixed = DRAG_FIXED_CACHE;
        let position = NETWORK.getPositions([node.id])[node.id];
        node.x = position.x;
        node.y = position.y;
        NODES_DATASET.update(node);
      }
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
      if (SHOWING_NODE !== null || COMPARE_NODE !== null) {
        DETAIL.innerHTML = '';
        NODES_DATASET.update(UNMODIFIED_DATA.nodes);
        EDGES_DATASET.clear();
        EDGES_DATASET.add(UNMODIFIED_DATA.edges);
        SHOWING_NODE = null;
        COMPARE_NODE = null;
      }
    }
  })


  NETWORK.on("configChange", (options) => {
    let baseOptions = NETWORK.getOptionsFromConfigurator();
    vis.util.deepExtend(baseOptions, options);
    window.localStorage.setItem(optionsKey, JSON.stringify(baseOptions));
  })
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
    return {color: colors.csOrange.blend(colors.red, 1-factor).hex, width: baseWidth*0.4*0.4, label: label}
  }
  else {
    return {color: colors.darkRed.hex, width: baseWidth*0.4*0.4, opacity: 0.6, dashArray:"8, 12", label: label}
  }
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
    if (node.type !== "ASSET" && node.crownstoneId) {
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

function togglePathVisualization() {
  INDIVIDUAL_PATH_VISUALIZATION = !INDIVIDUAL_PATH_VISUALIZATION;
  if (COMPARE_NODE) {
    EDGES_DATASET.clear()
    EDGES_DATASET.add(UNMODIFIED_DATA.edges)
    showNodePath(COMPARE_NODE);
  }
}

function togglePercentages(item) {
  if (item.checked) {
    SHOW_ASSET_PERCENTAGES = true;
  }
  else {
    SHOW_ASSET_PERCENTAGES = false;
  }
  if (SHOWING_NODE) {
    showNodeStatistics(SHOWING_NODE);
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