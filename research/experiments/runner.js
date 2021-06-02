const path = require("path")
const fs = require("fs")

// discover all topologies in the topologies folder
let topologyDir = fs.readdirSync(path.join(__dirname,'./topologies')).sort()
let topologies = [];
for (let topology of topologyDir) {
  if (path.extname(topology) === '.json') {
    topologies.push({name: topology.replace(".json", ''), path: path.join(__dirname, './topologies', topology)})
  }
}



// discover all scenarios in the scenarios folder
let scenarioDir = fs.readdirSync(path.join(__dirname,'./scenarios'))
let scenarios = [];
for (let scenarioItem of scenarioDir) {
  if (path.extname(scenarioItem) === '.js') {
    scenarios.push(require(path.join(__dirname, './scenarios', scenarioItem)))
  }
}

// sort by given names, not filenames.
scenarios.sort((a,b) => { return a.name > b.name ? 1 : -1})


async function run() {
  let data = {};
  let runtime = 1000;
  let preprocessingTime = 50;

  for (let topology of topologies) {
    data[topology.name] = {};
    for (let scenario of scenarios) {
      console.log("For topology", topology.name, "running", scenario.name,'...');
      data[topology.name][scenario.name] = await scenario.runner(topology.path, runtime, preprocessingTime);
    }
  }

  for (let topology of topologies) {
    getEasyExcelFormat(data[topology.name], topology.name + '.csv')
  }
}

function getEasyExcelFormat(data, filename) {
  let line = 'Loss% ,Distance 1, Distance 2, Distance 3, Distance 4, Distance 5\n'
  let lineCount = 1;
  for (let scenario in data) {
    line += scenario + ","
    for (let i = 1; i < 100; i++) {
      if (data[scenario].averageDistanceLoss[i] === undefined) { break }
      line += data[scenario].averageDistanceLoss[i].toFixed(2) + ','
    }
    line += "\n";
    lineCount++;
  }

  while (lineCount < 30) {
    line += "\n"
    lineCount++
  }

  line += 'Statistics,#Messages over Mesh,#Messages Sent,#Messages Relayed,#Messages Duplicate,#Message relays Blocked,#Messages dropped by queue,#Advertisements Sent\n'
  for (let scenario in data) {
    line += scenario + ","
    line += data[scenario].totalMessagesOverMesh + ','
    line += data[scenario].totalMessagesSent + ','
    line += data[scenario].totalMessagesRelayed + ','
    line += data[scenario].totalMessagesDuplicate + ','
    line += data[scenario].totalMessageRelaysBlocked + ','
    line += data[scenario].totalMessagesDroppedQueue + ','
    line += data[scenario].totalAdvertisementsSent + ','
    line += '\n'
  }
  line += '\n'

  let filePath = path.join(__dirname, filename);
  console.log("Writing results to ", filePath)
  fs.writeFileSync(filePath, line);
}


run();

