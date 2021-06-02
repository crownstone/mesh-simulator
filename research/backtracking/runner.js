const path = require("path")
const fs = require("fs")

let toplogy = path.join(__dirname, './topologies/double_string.json')

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
  let preprocessingTime = 10;

  for (let scenario of scenarios) {
    console.log("Starting", scenario.name);
    data[scenario.name] = await scenario.runner(toplogy, runtime, preprocessingTime);
  }

  getEasyExcelFormat(data)
}

function getEasyExcelFormat(data) {
  let line = 'Loss% ,Distance 1, Distance 2, Distance 3, Distance 4, Distance 5\n'
  let lineCount = 1;
  for (let scenario in data) {
    line += scenario + ","
    for (let i = 1; i < 6; i++) {
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

  console.log("Writing results to ", path.join(__dirname, './data.csv'))
  fs.writeFileSync(path.join(__dirname, './data.csv'), line);
}


run();

