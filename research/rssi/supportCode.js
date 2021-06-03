const {getTopology, getNetworkStatistics, getHubData} = require("../../util/util")


function getHubIdFromTopology (topology) {
  let hubData = getHubData();

  // search for hub
  let hubIds = [];
  for (let node of topology.nodes) {
    if (node.type === "CROWNSTONE_HUB") {
      hubIds.push(Number(node.id));
    }
  }

  if (hubIds.length > 1 && !hubData.hubId) {
    console.warn("Multiple hubs detected. Ids are:", hubIds)
    console.warn("Select one and set it as hubId in the hubData.json in <projectRoot>/util/credentials")
    process.exit()
  }
  else if (hubIds.length > 1) {
    if (hubIds.indexOf(hubData.hubId) === -1) {
      console.warn("Provided hubId in config file does not exist on this hub. Provided:",hubData.hubId, "Available:", hubIds);
      process.exit();
    }
  }
  else if (hubData.hubId !== hubIds[0]) {
    console.warn("The provided hubId is different from the available hub id. Provided:",hubData.hubId, "Available:", hubIds[0]);
  }

  let hubId = hubIds[0];

  return hubId;
}

module.exports = {getHubIdFromTopology}