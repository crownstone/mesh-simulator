import {EventBus} from "../util/EventBus";
import {MeshNode} from "../nodes/base/MeshNode";


export class StatisticsCollector {

  nodeReference : Record<macAddress, MeshNode> = {}
  nodeIdMap : {[crownstoneId: string]: macAddress} = {}
  nodes : StatisticsData = {};
  messageStartedHistory = {};
  messageHistory = {};
  relayDuplicateCheck = {};
  subscriptions = [];

  reset() {
    this.nodes = {};
    this.nodeReference = {};
    this.nodeIdMap = {};

    this.messageStartedHistory = {};
    this.messageHistory = {};
    this.relayDuplicateCheck = {};

    this.subscriptions.forEach((cleanup) => { cleanup(); });
    this.subscriptions = [];
  }

  initialize(nodeIdMap: {[crownstoneId: string]: macAddress} , nodeReference: Record<macAddress, MeshNode>) {
    this.nodeIdMap = nodeIdMap;
    this.nodeReference = nodeReference;
    for (let nodeId in this.nodeReference) {
      this._ensureNode(nodeId);
    }
    this.subscriptions.push(EventBus.on("MeshRelayDenied",              this.handleRelayDenied.bind(this)));
    this.subscriptions.push(EventBus.on("MeshRelay",                    this.handleMeshRelay.bind(this)))
    this.subscriptions.push(EventBus.on("DuplicateReceived",            this.handleDuplicateReceived.bind(this)))
    this.subscriptions.push(EventBus.on("MessageReceived",              this.handleMessageReceived.bind(this)))
    this.subscriptions.push(EventBus.on("MessageFailedToBeDelivered",   this.handleMessageFailed.bind(this)))
    this.subscriptions.push(EventBus.on("Advertisement",                this.handleAdvertisementSent.bind(this)))
    this.subscriptions.push(EventBus.on("MeshBroadcastQueued",          this.handleBroadcastQueued.bind(this)))
    this.subscriptions.push(EventBus.on("MeshBroadcastStarted",         this.handleBroadcastStarted.bind(this)))
    this.subscriptions.push(EventBus.on("MeshBroadcastIndividual",      this.handleBroadcastSent.bind(this)))
    this.subscriptions.push(EventBus.on("QueueOverflow",                this.handleQueueOverflow.bind(this)))
  }

  handleQueueOverflow(data: MeshQueueOverflowEvent) {
    let item = this._ensureNode(data.address);
    item.meshBroadcasts.queueOverflow.count += 1;
  }

  handleRelayDenied(data: MeshRelayDeniedEvent) {
    let item = this._ensureNode(data.deniedBy);
    item.meshBroadcasts.blocked.count += 1;
  }

  handleBroadcastSent(data: MeshBroadcastEvent) {
    let item = this._ensureNode(data.sender);
    item.meshBroadcasts.sent.count += 1;
    this._processReceiver(item.meshBroadcasts.sent.receivers, data);
  }


  handleBroadcastStarted(data: MeshBroadcastStartedEvent) {
    let item = this._ensureNode(data.sender);
    if (this.messageStartedHistory[data.sender][data.messageId] !== true) {
      item.meshBroadcasts.started.unique += 1;
      this.messageStartedHistory[data.sender][data.messageId] = true;
    }
    item.meshBroadcasts.started.count += 1;
  }

  handleBroadcastQueued(data: MeshBroadcastQueuedEvent) {
    let item = this._ensureNode(data.sender);
    if (this.messageHistory[data.sender][data.messageId] !== true) {
      item.meshBroadcasts.queued.unique += 1;
      item.meshBroadcasts.sent.unique += 1;
      this.messageHistory[data.sender][data.messageId] = true;
    }
    item.meshBroadcasts.queued.count += 1;
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
      item.meshBroadcasts.received.senders[sourceAddress] = {count: 0, outOf: null, paths: {}};
    }
    item.meshBroadcasts.received.senders[sourceAddress].count++;
    let path = data.path.join("__");
    if (item.meshBroadcasts.received.senders[sourceAddress].paths[path] === undefined) {
      item.meshBroadcasts.received.senders[sourceAddress].paths[path] = { count: 0}
    }
    item.meshBroadcasts.received.senders[sourceAddress].paths[path].count++;
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
      this.messageStartedHistory[mac] = {}
      this.messageHistory[mac] = {}
      this.nodes[mac] = {
        type: this.nodeReference[mac].type,
        crownstoneId: this.nodeReference[mac].crownstoneId,
        macAddress: mac,
        assetTrackingPropagation: { senders: {} },
        advertisements: {
          sent:     { unique: 0, count: 0, receivers: {} },
          received: { total: 0, outOf: 0, senders: {} },
        },
        meshBroadcasts: {
          started:   { unique: 0, count: 0 },
          queued:    { unique: 0, count: 0 },
          sent:      { unique: 0, count: 0, receivers: {} },
          relayed:   { unique: 0, count: 0, receivers: {} },

          queueOverflow: { count: 0 },

          received: { senders: {} },
          sentDuplicates: { count: 0, receivers: {} },
          blocked:  { count: 0 }
        }
      }
    }
    return this.nodes[mac];
  }

  finalize() {
    // First we collect and finalize all data regarding received advertisements
    for (let address in this.nodes) {
      let node = this.nodes[address];
      // check all the advertisement %
      let advertisements = node.advertisements;
      for (let senderAddress in advertisements.received.senders) {
        let senderNode = this.nodes[senderAddress];
        let sentAdvertisements = senderNode.advertisements.sent.unique;
        advertisements.received.senders[senderAddress].outOf = sentAdvertisements;

        advertisements.received.total += advertisements.received.senders[senderAddress].count;
        advertisements.received.outOf += advertisements.received.senders[senderAddress].outOf;
      }
    }

    // Then we collect and finalize all data regarding received mesh messages
    for (let address in this.nodes) {
      let node = this.nodes[address];

      // check all the sending %
      let mesh = node.meshBroadcasts;
      for (let otherAddress in this.nodes) {
        if (address == otherAddress) { continue; }
        let senderNode = this.nodes[otherAddress];
        let sentMeshBroadcasts = senderNode.meshBroadcasts.started.unique;
        if (mesh.received.senders[otherAddress] === undefined) {
          mesh.received.senders[otherAddress] = { count: 0, outOf: 0, paths: {}}
        }
        node.assetTrackingPropagation.senders[otherAddress] = {
          count: mesh.received.senders[otherAddress].count,
          outOf: senderNode.advertisements.received.outOf
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
    }
  }

}