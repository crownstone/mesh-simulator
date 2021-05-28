import {MeshNode} from "./nodes/base/MeshNode";
import {EventBus} from "./util/EventBus";
import {Util} from "./util/util";
const hypertimer = require("hypertimer");

let CHANNELS = [37,38,39];

export class MeshNetwork {

  nodeIdMap : Record<crownstoneId, macAddress> = {}
  nodes : Record<macAddress, MeshNode> = {}
  connections = {};
  connectionMap = {};
  timer: any;

  constructor(simulationRate: number = 100) {
    this.timer = hypertimer({rate: simulationRate, time: Date.now()});
    this.timer.pause();
  }

  runFor(seconds: number) {
    for (let nodeId in this.nodes) {
      this.nodes[nodeId].start();
    }
    console.time("simulate")
    console.log("Start simulating for", seconds, "seconds");
    return new Promise<void>((resolve, reject) => {
      this.timer.continue()
      this.timer.setTimeout(() => {
        console.log("Simulation completed.")
        console.timeEnd("simulate");
        this.timer.pause();
        this.reset();

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

    if (this.connections[`${from}_${to}`] === undefined) {
      if (this.connectionMap[from] === undefined) { this.connectionMap[from] = []; }
      if (this.connectionMap[to]   === undefined) { this.connectionMap[to]   = []; }

      this.connectionMap[from].push({to: to, rssi});
      this.connectionMap[to].push({to: from, rssi});

      this.connections[`${from}_${to}`] = rssi;
      this.connections[`${to}_${from}`] = rssi;
    }
  }

  broadcast(sender: crownstoneId, content : wrappedMessage, ttl: number, repeats: number) {
    let senderMacAddress = this.nodeIdMap[sender];
    if (!senderMacAddress) {
      console.warn("Something without a macAddress tried to send a mesh message");
      throw "NO_MAC_ADDRESS";
    }
    let connections = this.connectionMap[senderMacAddress] ?? [];
    content = {...content, path: [...content.path]};
    content.path.push(senderMacAddress);
    for (let connection of connections) {
      if (this.nodes[connection.to].isCrownstone) {
        for (let i = 0; i <= repeats; i++) {
          let success = this._transmit("MESH_BROADCAST", sender, senderMacAddress, connection.to, connection.rssi, content, ttl, repeats);
          EventBus.emit("MeshBroadcast", {
            sender: senderMacAddress,
            receiver: connection.to,
            success,
            messageId: content.id,
            ttl, repeats
          });
        }
      }
    }
  }

  // sendTargetedMessage(sender: crownstoneId, target: crownstoneId, content : wrappedMessage, ttl: number, repeats: number) {
  //   let senderMacAddress = this.nodeIdMap[sender];
  //   if (!senderMacAddress) {
  //     console.warn("Something without a macAddress tried to send a mesh message");
  //     throw "NO_MAC_ADDRESS";
  //   }
  //   let connections = this.connectionMap[senderMacAddress] ?? [];
  //   for (let connection of connections) {
  //     for (let i = 0; i <= repeats; i++) {
  //       let success = this._transmit("MESH_BROADCAST", sender, senderMacAddress, connection.to, connection.rssi, content, ttl, repeats, target);
  //
  //     }
  //   }
  // }


  advertise(senderMacAddress: macAddress, content: wrappedMessage) {
    let connections = this.connectionMap[senderMacAddress] ?? [];
    for (let connection of connections) {
      let success = this._transmit("ADVERTISEMENT", null, senderMacAddress, connection.to, connection.rssi, content, 0,0);
      EventBus.emit("Advertisement", {
        sender: senderMacAddress,
        receiver: connection.to,
        success,
        messageId: content.id
      });
    }
  }


  _transmit(messageType: MessageType, source: crownstoneId, sentBy: macAddress, to: macAddress, rssi: {37: number, 38: number, 39: number}, content: wrappedMessage, ttl: number, repeats: number, target : crownstoneId = null) {
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
        relayId: content.relayId,
        messageId: content.id,
        messageWillFail: messageWillFail,
        ttl, repeats
      });
      return;
    }

    if (messageWillFail) {
      // if it fails, we emit this update to check if certain relays are unneccesary
      EventBus.emit("MessageFailedToBeDelivered", {
        source: source,
        sender: sentBy,
        receiver: to,
        relayId: content.relayId,
        messageId: content.id,
        ttl, repeats
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
          EventBus.emit("MessageReceived", {
            source: source,
            sender: sentBy,
            receiver: to,
            relayId: content.relayId,
            messageId: content.id,
            path: [...content.path, to],
            ttl, repeats
          });
          this.nodes[to].handleMeshMessage(source, sentBy, content.data, rssiValue, ttl, repeats);
          let newTTL = ttl-1;
          if (newTTL > 0) {
            this._relay(source, this.nodes[to].macAddress, {...content}, newTTL, repeats, target);
          }
        }
      }
    });

    return true;
  }

  _relay(source: crownstoneId, senderMacAddress: macAddress, content : wrappedMessage, ttl: number, repeats: number, target: crownstoneId) {
    let connections = this.connectionMap[senderMacAddress] ?? [];
    if (target !== null) {
      if (this.nodes[senderMacAddress].allowMeshRelay(source, target, ttl) === false) {
        EventBus.emit("MeshRelayDenied", {
          sender: senderMacAddress,
          target: target,
          messageId: content.id,
          ttl, repeats
        });
        return;
      }
    }
    content.relayId = Util.getUUID();
    content.path = [...content.path];
    content.path.push(senderMacAddress);
    for (let connection of connections) {
      if (this.nodes[connection.to].isCrownstone) {
        for (let i = 0; i <= repeats; i++) {
          let success = this._transmit("MESH_BROADCAST", source, senderMacAddress, connection.to, connection.rssi, content, ttl, repeats);
          EventBus.emit("MeshRelay", {
            sender: senderMacAddress,
            receiver: connection.to,
            relayId: content.relayId,
            success,
            messageId: content.id,
            ttl, repeats
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
