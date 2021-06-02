import {MeshNode} from "./nodes/base/MeshNode";
import {EventBus} from "./util/EventBus";
import {Util} from "./util/Util";
const hypertimer = require("hypertimer");

let CHANNELS = [37,38,39];

export class MeshNetwork {

  nodeIdMap : {[crownstoneId: string]: macAddress} = {}
  nodes : Record<macAddress, MeshNode> = {}
  connections = {};
  connectionMap = {};
  timer: any;

  constructor() {
    this.timer = hypertimer({time: Date.now(), paced: false});
    this.timer.pause();
  }

  startNodes() {
    for (let nodeId in this.nodes) {
      this.nodes[nodeId].start();
    }
  }

  runFor(seconds: number) {
    console.time("Simulation took")
    console.log("Start simulating for", seconds, "seconds");
    return new Promise<void>((resolve, reject) => {
      this.timer.continue()
      this.timer.setTimeout(() => {
        console.timeEnd("Simulation took");
        this.timer.pause();
        resolve();
      }, seconds*1000);
    })
  }


  reset() {
    for (let nodeId in this.nodes) {
      this.nodes[nodeId].stop();
    }
    this.timer.clear()
  }

  clearTopology() {
    for (let nodeId in this.nodes) {
      this.nodes[nodeId].stop();
    }
    this.nodeIdMap = {};
    this.nodes = {};
    this.connections = {};
    this.connectionMap = {};
  }

  addNode(node: MeshNode) {
    this.nodes[node.macAddress] = node;
    if (node.crownstoneId) {
      this.nodeIdMap[node.crownstoneId] = node.macAddress;
    }
    node.placeInMesh(this);
  }

  addConnection(connection: Connection) {
    let rssi = connection.rssi;
    let from = connection.from;
    let to   = connection.to;

    if (!rssi) { rssi = -60; }

    if (typeof rssi === 'number') {
      rssi = {37: rssi, 38: rssi, 39: rssi};
    }

    if (!this.nodes[from] || !this.nodes[to]) { return; }

    if (this.connections[`${from}_${to}`] === undefined) {
      if (this.connectionMap[from] === undefined) { this.connectionMap[from] = []; }
      if (this.connectionMap[to]   === undefined) { this.connectionMap[to]   = []; }

      this.connectionMap[from].push({to: to, rssi});
      this.connectionMap[to].push({to: from, rssi});

      this.connections[`${from}_${to}`] = rssi;
      this.connections[`${to}_${from}`] = rssi;
    }
  }

  /**
   * This method uses the mesh-repeat implementation. Each node which receives this message will transmit a relay with the same amount of transmissions.
   * A transmissions value of 2 will send 2 messages in total.
   * @param sender
   * @param content
   * @param ttl
   * @param transmissions
   */
  broadcast(sender: crownstoneId, content : wrappedMessage, ttl: number, transmissions: number, target: crownstoneId = null) {
    if (ttl === undefined || transmissions === undefined) { throw "TTL AND TRANSMISSIONS IS REQUIRED"}

    let senderMacAddress = this.nodeIdMap[sender];
    if (!senderMacAddress) {
      console.warn("Something without a macAddress tried to send a mesh message");
      throw "NO_MAC_ADDRESS";
    }
    let connections = this.connectionMap[senderMacAddress] ?? [];
    content = {...content, path: [...content.path]};
    content.path.push(senderMacAddress);

    EventBus.emit("MeshBroadcastQueued", {
      sender: senderMacAddress,
      message: content,
      ttl, transmissions
    });

    for (let connection of connections) {
      if (this.nodes[connection.to].isCrownstone) {
        for (let i = 0; i < transmissions; i++) {
          let success = this._transmit("MESH_BROADCAST", sender, senderMacAddress, connection.to, connection.rssi, content, ttl, transmissions, target);
          EventBus.emit("MeshBroadcastIndividual", {
            sender: senderMacAddress,
            receiver: connection.to,
            success,
            message: content,
            ttl, transmissions
          });
        }
      }
    }
  }


  advertise(senderMacAddress: macAddress, content: wrappedMessage) {
    let connections = this.connectionMap[senderMacAddress] ?? [];
    for (let connection of connections) {
      let success = this._transmit("ADVERTISEMENT", null, senderMacAddress, connection.to, connection.rssi, content, 0,0);
      EventBus.emit("Advertisement", {
        sender: senderMacAddress,
        receiver: connection.to,
        success,
        message: content,
      });
    }
  }


  _transmit(
    messageType: MessageType,
    source: crownstoneId,
    sentBy: macAddress,
    to: macAddress,
    rssi: {37: number, 38: number, 39: number},
    content: wrappedMessage,
    ttl: number,
    transmissions: number,
    target : crownstoneId = null) {
    // mark this message as handled by the sender. This would result in no incorrect roundtrips.
    this.nodes[sentBy].handled_messages[content.id] = true;

    // select a channel to send on.
    let channel = CHANNELS[Math.floor(Math.random()*3)];
    let rssiValue = rssi[channel];

    // based on https://docs.google.com/presentation/d/1BQMg4pdtNYwcdteqjYfvp4uTrk7ALhCbtwU-_2TUadM/edit#slide=id.g7ef327826b_0_0
    let successRatio = 0.57;

    // apply effect of RSSI on success ratio.
    successRatio = modifyLossPercentageBasedOnRssi(successRatio, rssiValue);

    // check if the message will be delivered.
    let messageWillFail = Math.random() > successRatio;

    // This catches sending the message back to a node that has sent it, or a long way around to a node that receives it.
    if (this.nodes[to].handled_messages[content.id] === true) {
      EventBus.emit("DuplicateReceived", {
        source: source,
        sender: sentBy,
        receiver: to,
        message: content,
        messageWillFail: messageWillFail,
        ttl, transmissions
      });
      return;
    }

    if (messageWillFail) {
      // if it fails, we emit this update to check if certain relays are unneccesary
      EventBus.emit("MessageFailedToBeDelivered", {
        source: source,
        sender: sentBy,
        receiver: to,
        message: content,
        ttl, transmissions
      });
      return false;
    }

    // mark the message as handled before the timeout. This resolves bursts getting through multiple times.
    this.nodes[to].handled_messages[content.id] = true;


    setImmediate(() => {
      if (this.nodes[to]) {
        if (messageType === "ADVERTISEMENT") {
          this.nodes[to].handleAdvertisement(sentBy, content.data, rssiValue);
        }
        else if (messageType === "MESH_BROADCAST") {
          if (this.nodes[to].crownstoneId === target || target === null) {
            EventBus.emit("MessageReceived", {
              source: source,
              sender: sentBy,
              receiver: to,
              message: content,
              path: [...content.path, to],
              ttl, transmissions
            });
            this.nodes[to].handleMeshMessage(source, sentBy, content.data, rssiValue, ttl, transmissions);
          }
          if (this.nodes[to].crownstoneId == 1) {
            // console.log("sent from", this.nodes[sentBy].crownstoneId, "to", this.nodes[to].crownstoneId, ttl)
          }
          let newTTL = ttl-1;
          if (newTTL > 0.5) {
            this._relay(source, this.nodes[to].macAddress, {...content}, newTTL, transmissions, target);
          }
        }
      }
    });

    return true;
  }

  _relay(source: crownstoneId, senderMacAddress: macAddress, content : wrappedMessage, ttl: number, transmissions: number, target: crownstoneId) {
    let connections = this.connectionMap[senderMacAddress] ?? [];

    // set a new relay Id.
    content.relayId = Util.getUUID();
    content.path = [...content.path];
    content.path.push(senderMacAddress);

    let relayIsAllowed = this.nodes[senderMacAddress].allowMeshRelay(source, target, ttl);
    if (!relayIsAllowed) {
      EventBus.emit("MeshRelayDenied", {
        source: source,
        deniedBy: senderMacAddress,
        target: target,
        message: content,
        ttl, transmissions
      });
      return;
    }

    for (let connection of connections) {
      if (this.nodes[connection.to].isCrownstone) {
        for (let i = 0; i < transmissions; i++) {
          let success = this._transmit("MESH_BROADCAST", source, senderMacAddress, connection.to, connection.rssi, content, ttl, transmissions);
          EventBus.emit("MeshRelay", {
            sender: senderMacAddress,
            receiver: connection.to,
            success,
            message: content,
            ttl, transmissions
          });
        }
      }
    }
  }

}

/**
 * This can modify the successRatio
 * @param successRatio (    0 .. 1   )
 * @param rssi         ( -100 .. -10 )
 */
function modifyLossPercentageBasedOnRssi(successRatio, rssi) {
  // TODO: research effect of rssi on loss.
  return successRatio;
}