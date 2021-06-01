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
    let newEdge = {...edge, ...getEdgeSettingsRssi(edge.rssi), physics: true}
    if (nodeMap[newEdge.from] === "ASSET" && nodeMap[newEdge.to] !== "ASSET") {
      if (nodeMapSeeAssets[newEdge.to] === undefined) { nodeMapSeeAssets[newEdge.to] = 0; }
      nodeMapSeeAssets[newEdge.to]++;
      newEdge.physics = false;
      newEdge.smooth = false;
      newEdge.label = '';
      newEdge.color = "rgba(0,0,0,0.20)"
    }
    if (nodeMap[newEdge.to] === "ASSET" && nodeMap[newEdge.from] !== "ASSET") {
      if (nodeMapSeeAssets[newEdge.from] === undefined) { nodeMapSeeAssets[newEdge.from] = 0; }
      nodeMapSeeAssets[newEdge.from]++;
      newEdge.physics = false;
      newEdge.smooth = false;
      newEdge.label = '';
      newEdge.color = "rgba(0,0,0,0.20)"
    }
    edges.push(newEdge);
  }

  for (let node of data.nodes) {
    let newNode;
    if (node.type !== 'ASSET') {
      let visibleAssets = nodeMapSeeAssets[node.id];
      if (visibleAssets > 0) {
        newNode = {id: node.id, label: node.cid+":["+visibleAssets+"]", size: 30,  color: undefined, type: node.type, crownstoneId: node.cid, visibleAssets, group: node.type + ':' + visibleAssets, shape: shapeMap[node.type], mass: massMap[node.type], fixed: false}
      }
      else {
        newNode = {id: node.id, label: node.cid+": [0 assets in range]", size: 30, color: undefined,  type: node.type, crownstoneId: node.cid, visibleAssets, group: node.type + ':0', shape: shapeMap[node.type], mass: massMap[node.type], fixed: false}
      }

      if (node.position.x !== null) {
        newNode.x = node.position.x;
        newNode.y = node.position.y;
        newNode.fixed = true;
      }
      nodes.push(newNode);

    }
    else {
      let assetNode = {id: node.id, label: "Asset", crownstoneId: "Asset", size: 30, color: undefined, intervalMs: node.intervalMs, type: node.type, group: node.type, shape: shapeMap[node.type], mass: massMap[node.type], fixed: true};

      if (node.position.x !== null) {
        assetNode.x = node.position.x;
        assetNode.y = node.position.y;
        assetNode.fixed = true;
      }

      if (SHOW_ASSETS === false) {
        TMP_ASSET_STORE.push(assetNode)
      }
      else {
        nodes.push(assetNode);
      }
    }
  }

  console.log("HERE", nodes)

  NODES_DATASET.clear();
  EDGES_DATASET.clear();

  IGNORE_ADD_EVENT = true;

  NODES_DATASET.add(nodes);
  EDGES_DATASET.add(edges);

  IGNORE_ADD_EVENT = false;

  NETWORK.stabilize(300);

  let loadedEdges = EDGES_DATASET.get();
  UNMODIFIED_DATA = {nodes: nodes, edges: []};
  for (let edge of loadedEdges) {
    UNMODIFIED_DATA.edges.push({...edge})
  }
}




function updateTopology(addPositions = false) {
  let nodes = [];
  let edges = [];
  let assets = [];

  let positions = {};
  if (addPositions) {
    positions = NETWORK.getPositions()
  }

  function addNode(node, set) {
    let newNode = {id: node.id, macAddress: node.id, crownstoneId: node.crownstoneId, type: node.type};
    if (positions[node.id]) {
      newNode.position = positions[node.id]
    }
    if (node.intervalMs) {
      newNode.intervalMs = node.intervalMs;
    }
    set.push(newNode);
  }

  for (let node of UNMODIFIED_DATA.nodes) {
    addNode(node, nodes)
  }
  for (let asset of TMP_ASSET_STORE) {
    addNode(asset, assets)
  }

  if (assets.length === 0) {
    let nodes = NODES_DATASET.get();
    for (let node of nodes) {
      if (node.type === "ASSET") {
        addNode(node, assets)
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


function storePositions() {
  updateTopology(true)
}