import {EventBus} from "../util/EventBus";
import {MeshNode} from "../nodes/base/MeshNode";


export class StatisticsCollector {

  nodeReference : Record<macAddress, MeshNode> = {}
  nodeIdMap : {[crownstoneId: string]: macAddress} = {}
  nodes : StatisticsData = {};
  messageStartedHistory = {};
  messageHistory = {};
  usefulRelays = {};

  subscriptions = [];

  reset() {
    this.nodes = {};
    this.nodeReference = {};
    this.nodeIdMap = {};

    this.messageStartedHistory = {};
    this.messageHistory = {};
    this.usefulRelays = {};

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

  _checkToIgnore(data: any) : boolean {
    if (typeof data === 'object') {
      if (data.message?.data?._ignoreForStatistics === true) {
        return true;
      }
    }
    return false;
  }

  handleQueueOverflow(data: MeshQueueOverflowEvent) {
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.address);
    item.meshBroadcasts.queueOverflow.count += 1;
  }

  handleRelayDenied(data: MeshRelayDeniedEvent) {
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.deniedBy);
    item.meshBroadcasts.blocked.count += 1;
  }

  handleBroadcastSent(data: MeshBroadcastEvent) {
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.sender);
    item.meshBroadcasts.sent.count += 1;
    this._processReceiver(item.meshBroadcasts.sent.receivers, data);
  }


  handleBroadcastStarted(data: MeshBroadcastStartedEvent) {
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.sender);
    if (this.messageStartedHistory[data.sender][data.message.id] !== true) {
      item.meshBroadcasts.started.unique += 1;
      this.messageStartedHistory[data.sender][data.message.id] = true;
    }
    item.meshBroadcasts.started.count += 1;
  }

  handleBroadcastQueued(data: MeshBroadcastQueuedEvent) {
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.sender);
    if (this.messageHistory[data.sender][data.message.id] !== true) {
      item.meshBroadcasts.queued.unique += 1;
      item.meshBroadcasts.sent.unique += 1;
      this.messageHistory[data.sender][data.message.id] = true;
    }
    item.meshBroadcasts.queued.count += 1;
  }

  /**
   * A message relayed by the sender has reached someone that has already had it.
   * This is usually handled by the mesh stack but by minimizing the number of unneccesary relays we increase our bandwidth.
   * @param data
   */
  handleDuplicateReceived(data: MeshBroadcastDuplicateEvent) {
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.sender);
    if (item.meshBroadcasts.sentDuplicates.receivers[data.receiver] === undefined) {
      item.meshBroadcasts.sentDuplicates.receivers[data.receiver] = [];
    }
    item.meshBroadcasts.sentDuplicates.receivers[data.receiver].push(data.message.relayId);
  }

  /**
   * This check is here because if an id has been marked as duplicate, this can "clear its name". It would have been delivered
   * to something that needed it but it did not.
   *
   * The failing happens after the duplicate check.
   * @param data
   */
  handleMessageFailed(data: MeshBroadcastReceivedEvent) {
    if (this._checkToIgnore(data)) { return };

    if (data.message.relayId) {
      this.usefulRelays[data.message.relayId] = true;
    }
  }

  handleMessageReceived(data: MeshBroadcastReceivedEvent) {
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.receiver);

    if (data.message.relayId) {
      this.usefulRelays[data.message.relayId] = true;
    }

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
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.sender);
    if (this.messageHistory[data.sender][data.message.id] !== true) {
      item.advertisements.sent.unique += 1;
      this.messageHistory[data.sender][data.message.id] = true;
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
    if (this._checkToIgnore(data)) { return };

    let item = this._ensureNode(data.sender);
    if (this.messageHistory[data.sender][data.message.id] !== true) {
      item.meshBroadcasts.relayed.unique += 1;
      this.messageHistory[data.sender][data.message.id] = true;
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
          if (this.usefulRelays[relayId] !== true) {
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