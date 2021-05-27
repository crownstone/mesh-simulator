interface PromiseContainer<T> {
  promise: Promise<T>,
  resolve: (data?: any) => void,
  reject:  (err:   any) => void
}


type macAddress = string;
type crownstoneId = string;

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
  ttl: number,
  repeats: number
}


interface StatisticsData {
  [macAddress:string] : {
    type: string,
    crownstoneId: string,
    advertisements: {
      sent: { unique: number, count: number, receivers: StatisticsSuccessRate },
      received: { senders: StatisticsReceiveRate },
    },
    meshBroadcasts: {
      sent:    { unique: number, count: number, receivers: StatisticsSuccessRate},
      relayed: { unique: number, count: number, receivers: StatisticsSuccessRate},

      received: { senders: StatisticsReceiveRate}
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
interface StatisticsDuplicateRate {
  [macAddress:string] : number
}