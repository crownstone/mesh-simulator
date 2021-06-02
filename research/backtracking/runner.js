const path = require("path")
const fs = require("fs")

const scenario1 = require("./scenarios/Scenario1")
const scenario2 = require("./scenarios/Scenario2")
const scenario3 = require("./scenarios/Scenario3")
const scenario4 = require("./scenarios/Scenario4")
const scenario5 = require("./scenarios/Scenario5")
const scenario6 = require("./scenarios/Scenario6")
const scenario7 = require("./scenarios/Scenario7")

let toplogy = path.join(__dirname, './topologies/double_string.json')

async function run() {
  let data = {};
  let scenarioCount = 1;
  let runtime = 1000;
  let preprocessingTime = 10;

  console.log("Scenario", scenarioCount);
  data[scenarioCount] = await scenario1(toplogy, runtime, preprocessingTime);
  scenarioCount++

  console.log("Scenario", scenarioCount);
  data[scenarioCount] = await scenario2(toplogy, runtime, preprocessingTime);
  scenarioCount++

  console.log("Scenario", scenarioCount);
  data[scenarioCount] = await scenario3(toplogy, runtime, preprocessingTime);
  scenarioCount++

  console.log("Scenario", scenarioCount);
  data[scenarioCount] = await scenario4(toplogy, runtime, preprocessingTime);
  scenarioCount++

  console.log("Scenario", scenarioCount);
  data[scenarioCount] = await scenario5(toplogy, runtime, preprocessingTime);
  scenarioCount++

  console.log("Scenario", scenarioCount);
  data[scenarioCount] = await scenario6(toplogy, runtime, preprocessingTime);
  scenarioCount++

  console.log("Scenario", scenarioCount);
  data[scenarioCount] = await scenario7(toplogy, runtime, preprocessingTime);

  getEasyExcelFormat(data)
}

function getEasyExcelFormat(data) {
  let line = 'Loss% ,Distance 1, Distance 2, Distance 3, Distance 4, Distance 5\n'
  for (let scenario in data) {
    line += 'Scenario ' + scenario + ","
    for (let i = 1; i < 6; i++) {
      line += data[scenario].averageDistanceLoss[i].toFixed(2) + ','
    }
    line += "\n"
  }

  line += "\n"
  line += "\n"

  line += 'Statistics,#Messages over Mesh,#Messages Sent,#Messages Relayed,#Messages Duplicate,#Message relays Blocked,#Messages dropped by queue,#Advertisements Sent\n'
  for (let scenario in data) {
    line += 'Scenario ' + scenario + ","
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

