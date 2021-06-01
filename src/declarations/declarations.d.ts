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
  messageId: string,
}

interface MeshBroadcastEvent {
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  messageId: string,
  ttl: number,
  repeats: number
}
interface MeshQueueOverflowEvent {
  address: macAddress,
  tranmissions: number
}


interface MeshBroadcastStartedEvent {
  sender: macAddress,
  messageId: string,
  ttl: number,
  repeats: number
}
type MeshBroadcastQueuedEvent = MeshBroadcastStartedEvent;

interface MeshRelayEvent {
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  relayId: string,
  messageId: string,
  ttl: number,
  repeats: number
}

interface MeshBroadcastDuplicateEvent {
  source: crownstoneId,
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  relayId: string,
  messageId: string,
  messageWillFail: boolean,
  ttl: number,
  repeats: number
}

interface MeshBroadcastReceivedEvent {
  source: crownstoneId,
  sender: macAddress,
  receiver: macAddress,
  success: boolean,
  relayId: string,
  messageId: string,
  path: macAddress[],
  ttl: number,
  repeats: number
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
      blocked: { receivers: StatisticsSuccessRate}
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

interface InputTopologyNode {
  id: number,
  macAddress?: macAddress
  crownstoneId?: number
  type: DeviceType,
}

interface InputTopologyAssetNode {
  id: number,
  macAddress?: macAddress
  intervalMs: number,
}
interface InputTopologyConnection {
  from: number | macAddress,
  to:   number | macAddress,
  rssi?: number | {37: number, 38: number, 39: number}
}
