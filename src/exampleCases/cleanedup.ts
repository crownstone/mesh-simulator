import {Crownstone} from "../nodes/Crownstone";
import {MeshSimulator} from "../MeshSimulator";

class CrownstoneNode extends Crownstone {
  handleAdvertisement(from: macAddress, data, rssi) {
    // console.log(from, "GOT AVD", this.macAddress, this.meshTimer.getTime())
    this.broadcastBurst({macAddress: from, rssi}, 5)
  }
}

let topology : InputTopology = {
  nodes: [
    {id: 1, type:"HUB"},
    {id: 2, type:"CROWNSTONE"},
    {id: 3, type:"CROWNSTONE"},
    {id: 4, type:"CROWNSTONE"},
    {id: 5, type:"CROWNSTONE"},
    {id: 6, type:"CROWNSTONE"},
  ],
  assets: [
    {id: 7, intervalMs: 100},
  ],
  connections: [
    {from: 1, to: 2},
    {from: 1, to: 3},
    {from: 1, to: 4},
    {from: 1, to: 5},
    {from: 4, to: 6},
    {from: 4, to: 7},
  ]
}

let sim = new MeshSimulator()
sim.setTopology(topology, {CROWNSTONE: CrownstoneNode})
async function run() {
  // await sim.run(100)
  await sim.waitForConnection()
  // console.log(JSON.stringify(sim.report(), null, 2))
}
run();