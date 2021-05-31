import {MeshNetwork} from "./MeshNetwork";
import {MeshNode} from "./nodes/base/MeshNode";
import {StatisticsCollector} from "./statistics/StatisticsCollector";
import {SocketServer} from "./servers/socketServer";
import {Hub} from "./nodes/Hub";
import {Asset} from "./nodes/Asset";
import {Crownstone} from "./nodes/Crownstone";
import {Util} from "./util/Util";
import * as fs from "fs";

interface InputClassMap {
  HUB?:        typeof Hub,
  CROWNSTONE?: typeof Crownstone,
  ASSET?:      typeof Asset,
}

const DEFAULT_CLASS_MAP : InputClassMap = {
  HUB:        Hub,
  CROWNSTONE: Crownstone,
  ASSET:      Asset,
}

export class MeshSimulator {

  network:    MeshNetwork;
  statistics: StatisticsCollector;
  server:     SocketServer;

  topology = {nodes: [], connections: []};
  newTopologyPath = null;
  inputClassMap: InputClassMap;


  constructor(useGui = true) {
    this.network    = new MeshNetwork();
    this.statistics = new StatisticsCollector();
    this.server     = new SocketServer();
    this.server.setMessageHandler(this.messageHandler.bind(this));

    if (useGui) {
      this.server.createServer();
    }
  }

  allowNewTopology(path: string) {
    this.newTopologyPath = path;
  }

  async messageHandler(message) {
    if (typeof message !== 'object') { return; }

    if (message.type == "UPDATE_TOPOLOGY") {
      if (this.newTopologyPath !== null) {
        fs.writeFileSync(this.newTopologyPath, JSON.stringify(message.data, undefined, 4));
        this.setTopologyFromFile(this.newTopologyPath, this.inputClassMap);
        await this.run(10);
        this.server.send({type:"STATISTICS", data: this.statistics.nodes})
      }
    }
    else if (message.type == "GET_TOPOLOGY") {
      let data = {
        nodes: [],
        edges: []
      };
      for (let node of this.topology.nodes)               { data.nodes.push({id: node.macAddress, cid: node.crownstoneId, type: node.type, intervalMs: node.intervalMs}); }
      for (let connection of this.topology.connections)   { data.edges.push(connection); }
      this.server.send({type:"TOPOLOGY", data: data});
    }
    else if (message.type == "RUN_SIMULATION") {
      await this.run(message.data);
      this.server.send({type:"STATISTICS", data: this.statistics.nodes})
    }
    else if (message.type == "CAN_EDIT_TOPOLOGY") {
      this.server.send({type:"CAN_EDIT_TOPOLOGY", data: this.newTopologyPath !== null})
    }
  }

  addNodes(nodes: MeshNode[]) {
    this.topology.nodes = nodes;
    for (let node of nodes) {
      this.network.addNode(node);
    }
  }

  addConnections(connections: Connection[]) {
    this.topology.connections = connections;
    for (let connection of connections) {
      this.network.addConnection(connection)
    }
  }

  setTopologyFromFile(filePath : string, classMap: InputClassMap) {
    this.inputClassMap = classMap;
    let content = fs.readFileSync(filePath, 'utf-8');
    let json = JSON.parse(content);
    this.setTopology(json, classMap);
  }

  setTopology(topology: InputTopology, classMap: InputClassMap) {
    this.inputClassMap = classMap;
    let nodes = [];
    let connections = [];

    let idMap = {}
    for (let node of topology.nodes) {
      if (node.type !== "ASSET") {
        let constructor = classMap[node.type] ?? DEFAULT_CLASS_MAP[node.type];
        let id = node.crownstoneId ?? node.id;
        let item = new constructor(id, node.macAddress ?? Util.getMacAddress());
        idMap[id] = item.macAddress;
        nodes.push(item);
      }
    }
    for (let node of topology.assets) {
      let constructor = classMap.ASSET ?? DEFAULT_CLASS_MAP.ASSET;
      let item = new constructor(node.intervalMs, node.macAddress ?? Util.getMacAddress());
      idMap[node.id] = item.macAddress;
      nodes.push(item);
    }

    for (let connection of topology.connections) {
      let fromMac = connection.from;
      let toMac   = connection.to;
      if (typeof connection.from === 'number') { fromMac = idMap[connection.from]; }
      if (typeof connection.to   === 'number') { toMac   = idMap[connection.to];   }

      connections.push({from: fromMac, to: toMac, rssi: connection.rssi})
    }

    this.addNodes(nodes);
    this.addConnections(connections);
  }

  async prepare(seconds: number) {
    this.statistics.reset();
    this.statistics.initialize(this.network.nodeIdMap, this.network.nodes);
    if (this.server._connected) {
      this.server.send({type:"START_SIMULATION", data: seconds});
    }
    await this.network.runFor(seconds);
  }

  async run(seconds: number, precomputeSeconds: number = 0) {
    this.statistics.reset();
    this.statistics.initialize(this.network.nodeIdMap, this.network.nodes);

    this.network.startNodes();
    if (precomputeSeconds > 0) {
      if (this.server._connected) {
        this.server.send({type:"PRECOMPUTING", data: precomputeSeconds});
      }

      // run the precomputation step to reach steady-state;
      await this.network.runFor(precomputeSeconds);

      // reset statistics
      this.statistics.reset();
      this.statistics.initialize(this.network.nodeIdMap, this.network.nodes);
    }


    if (this.server._connected) {
      this.server.send({type:"START_SIMULATION", data: seconds});
    }

    await this.network.runFor(seconds);

    // wrap up the simulation timer and nodes
    this.network.reset()

    // do the final calculation on the statistics.
    this.statistics.finalize();

    if (this.server._connected) {
      this.server.send({type:"STATISTICS", data: this.statistics.nodes});
    }
  }

  async waitForConnection() {
    await this.server.connectionEstablished();
  }

  report() {
    return this.statistics.nodes;
  }
}