const https = require("https")
async function getData(path) {
  return new Promise((resolve, reject) => {
    // configure the request
    const options = {
      method: 'GET',
      rejectUnauthorized: false // !IMPORTANT! This allows us to ignore the self-signed certificate.
    }

    const req = https.request(path, options, (res) => {
      console.log('statusCode:', res.statusCode);
      let data = ''
      res.on('data', (d) => {
        data += d;
      });

      res.on('end', () => {
        let str = data.toString('utf8')
        resolve(JSON.parse(str))
      })
    });

    req.end();
  })
}


async function getTopology() {
  let {hubUrl, token} = getHubData()
  if (hubUrl.substr(hubUrl.length-1,1) !== "/") {
    hubUrl += '/';
  }

  let data = await getData(hubUrl+'api/network?access_token=' + token)
  let nodes       = [];
  let connections = [];

  let connectionSizeMap = {};
  let duplicateMap = {}
  for (let i = 0; i < data.edges.length; i++) {
    let edgeData = data.edges[i];
    let average  = 0;
    let avgCount = 0;
    if (edgeData.rssi['37'] !== 0) { average += edgeData.rssi['37']; avgCount += 1; }
    if (edgeData.rssi['38'] !== 0) { average += edgeData.rssi['38']; avgCount += 1; }
    if (edgeData.rssi['39'] !== 0) { average += edgeData.rssi['39']; avgCount += 1; }

    let id = getEdgeId(edgeData);
    // this eliminates the back-forth edges.
    if (duplicateMap[id] === undefined) {
      duplicateMap[id] = true;
      connections.push({from: edgeData.from, to: edgeData.to, rssi: edgeData.rssi, averageRssi: average/avgCount});
    }
  }

  for (let nodeId in data.nodes) {
    let node = data.nodes[nodeId];
    let locationName = node.locationCloudId;
    if (locationName && data.locations[locationName]) {
      locationName = data.locations[locationName].name;

    }
    nodes.push({id: nodeId, label: node.name, ...node, group: locationName, size: connectionSizeMap[nodeId] || 15, shape: node.type === 'CROWNSTONE_HUB' ? 'star' : 'dot'})
  }

  return {nodes, connections, data}
}



async function getNetworkStatistics() {
  let {hubUrl, token} = getHubData()
  if (hubUrl.substr(hubUrl.length-1,1) !== "/") {
    hubUrl += '/';
  }

  let data = await getData(hubUrl+'api/network/statistics?access_token=' + token)

  return data
}

let fs = require("fs");
let path = require("path");
function getHubData() {
  let dataPath = path.join(__dirname,"./credentials/hubData.json");
  if (fs.existsSync(dataPath) === false) {
    console.warn("Create a hubData.json before running this example.");
    process.exit();
  }
  let data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data)
}

function getEdgeId(edge) {
  let ar = [edge.to, edge.from]
  ar.sort();
  return ar.join("__")
}

module.exports = {
  getTopology,
  getData,
  getNetworkStatistics,
  getHubData
}