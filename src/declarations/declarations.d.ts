interface PromiseContainer<T> {
  promise: Promise<T>,
  resolve: (data?: any) => void,
  reject:  (err:   any) => void
}


type macAddress = string;
type crownstoneId = number;

type PromiseCallback = (any) => Promise<any>
type callback = () => void;

interface AdvertisementEvent {
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  message: wrappedMessage,
}

interface MeshBroadcastEvent {
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  message: wrappedMessage,
  ttl: number,
  transmissions: number
}
interface MeshQueueOverflowEvent {
  address: macAddress,
  tranmissions: number
}

interface MeshRelayDeniedEvent {
  source: crownstoneId,
  deniedBy: macAddress,
  target: crownstoneId,
  message: wrappedMessage,
  ttl : number,
  transmissions: number
}

interface MeshBroadcastStartedEvent {
  sender: macAddress,
  message: wrappedMessage,
  ttl: number,
  transmissions: number
}
type MeshBroadcastQueuedEvent = MeshBroadcastStartedEvent;

interface MeshRelayEvent {
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  message: wrappedMessage,
  ttl: number,
  transmissions: number
}

interface MeshBroadcastDuplicateEvent {
  source: crownstoneId,
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  message: wrappedMessage,
  messageWillFail: boolean,
  ttl: number,
  transmissions: number
}

interface MeshBroadcastReceivedEvent {
  source: crownstoneId,
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  message: wrappedMessage,
  path: macAddress[],
  ttl: number,
  transmissions: number
}


interface StatisticsData {
  [macAddress:string] : {
    type: string,
    crownstoneId: number,
    macAddress: macAddress,
    assetTrackingPropagation: {senders: {}}
    advertisements: {
      sent: { unique: number, count: number, receivers: StatisticsSuccessRate },
      received: { total: number, outOf: number, senders: StatisticsReceiveRate },
    },
    meshBroadcasts: {
      started: { unique: number, count: number },
      queued:  { unique: number, count: number },
      sent:    { unique: number, count: number, receivers: StatisticsSuccessRate},
      relayed: { unique: number, count: number, receivers: StatisticsSuccessRate},
      queueOverflow: {count: number},
      received: { senders: StatisticsReceiveData }
      sentDuplicates: { count: number, receivers: { [macAddress: string]: string[] }},
      blocked: { count: number }
    }
  }
}

interface StatisticsSuccessRate {
  [macAddress:string] : {
    successCount: number,
    failCount: number,
  }
}
interface StatisticsReceiveRate {
  [macAddress:string] : {
    count: number,
    outOf: number,
  }
}
interface StatisticsReceiveData {
  [macAddress:string] : {
    count: number,
    outOf: number,
    paths: {[pathList : string] : { count: number }}
  }
}
interface StatisticsDuplicateRate {
  [macAddress:string] : number
}

interface Connection {
  from: macAddress,
  to: macAddress,
  rssi?: number | {37: number, 38: number, 39: number}
}

type DeviceType = "HUB" | "CROWNSTONE" | "ASSET";

interface InputTopology {
  nodes: InputTopologyNode[],
  assets?: InputTopologyAssetNode[],
  connections: InputTopologyConnection[],
}

interface InputTopologyNode extends InputTopologyBaseNode {
  crownstoneId?: number,
}

interface InputTopologyAssetNode extends InputTopologyBaseNode {
  intervalMs: number,
}

interface InputTopologyBaseNode {
  id: number,
  macAddress?: macAddress
  type: DeviceType,
  position?: {x: number, y: number}
}

interface InputTopologyConnection {
  from: number | macAddress,
  to:   number | macAddress,
  rssi?: number | {37: number, 38: number, 39: number}
}
