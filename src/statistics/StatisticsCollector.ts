import {EventBus} from "../util/EventBus";
import {MeshNode} from "../nodes/base/MeshNode";


export class StatisticsCollector {


  nodeReference : Record<macAddress, MeshNode> = {}
  nodeIdMap : Record<macAddress, crownstoneId> = {}
  nodes : StatisticsData = {};
  messageHistory = {};
  relayDuplicateCheck = {};
  subscriptions = [];

  constructor() {

  }

  reset() {
    this.nodes = {};
    this.messageHistory = {};
    this.relayDuplicateCheck = {};
    for (let nodeId in this.nodeReference) {
      this._ensureNode(nodeId);
    }
  }

  initialize(nodeIdMap: Record<macAddress, crownstoneId>, nodeReference: Record<macAddress, MeshNode>) {
    this.nodeIdMap = nodeIdMap;
    this.nodeReference = nodeReference;
    for (let nodeId in this.nodeReference) {
      this._ensureNode(nodeId);
    }
    // this.subscriptions.push(EventBus.on("MeshRelayDenied", (data) => {
    //
    // }))
    this.subscriptions.push(EventBus.on("MeshRelay",                    this.handleMeshRelay.bind(this)))
    this.subscriptions.push(EventBus.on("DuplicateReceived",            this.handleDuplicateReceived.bind(this)))
    this.subscriptions.push(EventBus.on("MessageReceived",              this.handleMessageReceived.bind(this)))
    this.subscriptions.push(EventBus.on("MessageFailedToBeDelivered",   this.handleMessageFailed.bind(this)))
    this.subscriptions.push(EventBus.on("Advertisement",                this.handleAdvertisementSent.bind(this)))
    this.subscriptions.push(EventBus.on("MeshBroadcast",                this.handleBroadcastSent.bind(this)))
  }

  handleBroadcastSent(data: MeshBroadcastEvent) {
    let item = this._ensureNode(data.sender);
    if (this.messageHistory[data.sender][data.messageId] !== true) {
      item.meshBroadcasts.sent.unique += 1;
      this.messageHistory[data.sender][data.messageId] = true;
    }
    item.meshBroadcasts.sent.count += 1;
    this._processReceiver(item.meshBroadcasts.sent.receivers, data);
  }

  /**
   * A message relayed by the sender has reached someone that has already had it.
   * This is usually handled by the mesh stack but by minimizing the number of unneccesary relays we increase our bandwidth.
   * @param data
   */
  handleDuplicateReceived(data: MeshBroadcastDuplicateEvent) {
    let item = this._ensureNode(data.sender);
    if (item.meshBroadcasts.sentDuplicates.receivers[data.receiver] === undefined) {
      item.meshBroadcasts.sentDuplicates.receivers[data.receiver] = [];
    }
    item.meshBroadcasts.sentDuplicates.receivers[data.receiver].push(data.relayId)
  }

  /**
   * This check is here because if an id has been marked as duplicate, this can "clear its name". It would have been delivered
   * to something that needed it but it did not.
   *
   * The failing happens after the duplicate check.
   * @param data
   */
  handleMessageFailed(data: MeshBroadcastReceivedEvent) {
    delete this.relayDuplicateCheck[data.relayId];
  }

  handleMessageReceived(data: MeshBroadcastReceivedEvent) {
    let item = this._ensureNode(data.receiver);
    delete this.relayDuplicateCheck[data.relayId];

    let sourceAddress = this.nodeIdMap[data.source];
    if (item.meshBroadcasts.received.senders[sourceAddress] === undefined) {
      item.meshBroadcasts.received.senders[sourceAddress] = {count: 0, outOf: null};
    }
    item.meshBroadcasts.received.senders[sourceAddress].count++;
  }


  handleAdvertisementSent(data: AdvertisementEvent) {
    let item = this._ensureNode(data.sender);
    if (this.messageHistory[data.sender][data.messageId] !== true) {
      item.advertisements.sent.unique += 1;
      this.messageHistory[data.sender][data.messageId] = true;
    }
    item.advertisements.sent.count += 1;
    this._processReceiver(item.advertisements.sent.receivers, data);

    if (data.success) {
      let receiver = this._ensureNode(data.receiver);
      if (receiver.advertisements.received.senders[data.sender] === undefined) {
        receiver.advertisements.received.senders[data.sender] = {count: 0, outOf: null};
      }
      receiver.advertisements.received.senders[data.sender].count++;
    }
  }


  handleMeshRelay(data: MeshRelayEvent) {
    let item = this._ensureNode(data.sender);
    this.relayDuplicateCheck[data.relayId] = true;
    if (this.messageHistory[data.sender][data.messageId] !== true) {
      item.meshBroadcasts.relayed.unique += 1;
      this.messageHistory[data.sender][data.messageId] = true;
    }
    item.meshBroadcasts.relayed.count += 1;
    this._processReceiver(item.meshBroadcasts.relayed.receivers, data);
  }

  _processReceiver(object, data) {
    if (object[data.receiver] === undefined) {
      object[data.receiver] = {successCount: 0, failCount: 0};
    }

    if (data.success) {
      object[data.receiver].successCount++;
    }
    else {
      object[data.receiver].failCount++;
    }
  }

  _ensureNode(mac) {
    if (this.nodes[mac] === undefined) {
      this.messageHistory[mac] = {}
      this.nodes[mac] = {
        type: this.nodeReference[mac].type,
        crownstoneId: this.nodeReference[mac].crownstoneId,
        advertisements: {
          sent:     { unique: 0, count: 0, receivers: {} },
          received: { senders: {} },
        },
        meshBroadcasts: {
          sent:    { unique: 0, count: 0, receivers: {} },
          relayed: { unique: 0, count: 0, receivers: {} },

          received: { senders: {} },
          sentDuplicates: { count: 0, receivers: {} },
          blocked:  { receivers: {} }
        }
      }
    }
    return this.nodes[mac];
  }

  finalize() {
    for (let address in this.nodes) {
      let node = this.nodes[address];
      let mesh = node.meshBroadcasts;
      // check all the sending %
      for (let otherAddress in this.nodes) {
        if (address == otherAddress) { continue; }
        let senderNode = this.nodes[otherAddress];
        let sentMeshBroadcasts = senderNode.meshBroadcasts.sent.unique;
        if (mesh.received.senders[otherAddress] === undefined) {
          mesh.received.senders[otherAddress] = { count: 0, outOf: 0}
        }
        mesh.received.senders[otherAddress].outOf = sentMeshBroadcasts;
      }

      // check all the relay duplicates
      let duplicateMap = {};
      for (let receiverAddress in mesh.sentDuplicates.receivers) {
        let ids = mesh.sentDuplicates.receivers[receiverAddress];
        for (let relayId of ids) {
          // if this relayId is still in the check list, this message has not been delivered anywhere.
          if (this.relayDuplicateCheck[relayId] === true) {
            duplicateMap[relayId] = true;
          }
        }
      }
      mesh.sentDuplicates.count = Object.keys(duplicateMap).length;
      // remove the receiver list since it's data is already processed.
      mesh.sentDuplicates.receivers = {};

      // check all the advertisement %
      let advertisements = node.advertisements;
      for (let senderAddress in advertisements.received.senders) {
        let senderNode = this.nodes[senderAddress];
        let sentAdvertisements = senderNode.advertisements.sent.unique;
        advertisements.received.senders[senderAddress].outOf = sentAdvertisements;
      }
    }
  }

}