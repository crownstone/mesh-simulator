let VIS_CONTAINER;
let TOKEN_INPUT_WRAPPER;
let CONNECTED_STATE;
let GRAPH_WRAPPER;
let SIM_OVERLAY;
let PRECOMPUTE_OVERLAY;
let DETAIL;
let TOPOLOGY_BUTTON_ADD_NODE;
let TOPOLOGY_BUTTON_ADD_EDGE;
let TOPOLOGY_BUTTON_DELETE;
let TOPOLOGY_STORE_POSITIONS;


function initDOM() {
  GRAPH_WRAPPER            = document.getElementById("networkContainer");
  CONNECTED_STATE          = document.getElementById("connectedState");
  DETAIL                   = document.getElementById("detail");
  VIS_CONTAINER            = document.getElementById("meshTopology");
  SIM_OVERLAY              = document.getElementById("simulatingOverlay");
  PRECOMPUTE_OVERLAY       = document.getElementById("precomputingOverlay");
  TOPOLOGY_BUTTON_ADD_NODE = document.getElementById("topologyButtonAddNode");
  TOPOLOGY_BUTTON_ADD_EDGE = document.getElementById("topologyButtonAddEdge");
  TOPOLOGY_BUTTON_DELETE   = document.getElementById("topologyButtonDelete");
  TOPOLOGY_STORE_POSITIONS = document.getElementById("storePositions");

  EVENTBUS.on("Connected", () => {
    CONNECTED_STATE.innerHTML = "Connected!";
    CLIENT.send({type:"GET_TOPOLOGY"})
    CLIENT.send({type:"CAN_EDIT_TOPOLOGY"})
  })
  EVENTBUS.on("Disconnected", () => { CONNECTED_STATE.innerHTML = "Disconnected..."})

}