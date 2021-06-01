EVENTBUS.on("Message", (data) => {
  if (data.type === "TOPOLOGY") {
    loadTopology(data.data);
  }
  else if (data.type === "STATISTICS") {
    PRECOMPUTE_OVERLAY.style.display = "none";
    SIM_OVERLAY.style.display = "none";
    loadStatistics(data.data);

    for (let node of UNMODIFIED_DATA.nodes) {
      if (node.type === 'HUB') {
        console.log("selecting", node.id);
        NETWORK.selectNodes([node.id]);
        showNodeStatistics(NODES_DATASET.get(node.id));
      }
    }
  }
  else if (data.type === "PRECOMPUTING") {
    PRECOMPUTE_OVERLAY.style.display = "block";
    SIM_OVERLAY.style.display = "none";
  }
  else if (data.type === "START_SIMULATION") {
    PRECOMPUTE_OVERLAY.style.display = "none";
    SIM_OVERLAY.style.display = "block";
  }
  else if (data.type === "CAN_EDIT_TOPOLOGY") {
    if (data.data === true) {
      TOPOLOGY_BUTTON_ADD_NODE.style.display = "inline-block";
      TOPOLOGY_BUTTON_ADD_EDGE.style.display = "inline-block";
      TOPOLOGY_BUTTON_DELETE.style.display   = "inline-block";
      TOPOLOGY_STORE_POSITIONS.style.display   = "inline-block";
    }
    else {
      TOPOLOGY_BUTTON_ADD_NODE.style.display = "none";
      TOPOLOGY_BUTTON_ADD_EDGE.style.display = "none";
      TOPOLOGY_BUTTON_DELETE.style.display   = "none";
      TOPOLOGY_STORE_POSITIONS.style.display = "none";
    }
  }
})