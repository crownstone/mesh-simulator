import {MeshNetwork} from "../../MeshNetwork";
import {Util} from "../../util/Util";
import {MeshQueue} from "./MeshQueue";
import {EventBus} from "../../util/EventBus";


type callback = () => void;
export class MeshNode {

  type: string;
  crownstoneId: number = null;
  macAddress: macAddress;
  mesh: MeshNetwork;
  isCrownstone = true;

  handled_messages = {};
  cleanupMethods : callback[] = []

  meshTimer : any;

  queue: MeshQueue;

  // position used for gui purposes.
  position = {x: null, y: null}

  constructor(macAddress?: macAddress) {
    this.macAddress = macAddress ?? Util.getMacAddress();
    this.queue = new MeshQueue(20, 3);
  }


  /**
   * Used to set event listeners etc.
   */
  init()    {}
  cleanup() {}

  stop() {
    this.queue.reset();
    this.handled_messages = {};
    this.cleanup();
    for (let cleanupMethod of this.cleanupMethods) {
      cleanupMethod();
    }
    this.cleanupMethods = [];
  }

  /**
   * Called just before simulation starts
   */
  start() { /** OVERRIDE IN CHILD CLASS **/ }


  placeInMesh(mesh: MeshNetwork) {
    this.mesh = mesh;
    this.meshTimer = this.mesh.timer;
    this.queue.timer = this.mesh.timer;
    this.init();
  }


  broadcast(data: message, ttl: number, transmissions, target: crownstoneId = null) {
    if (ttl === undefined || transmissions === undefined) { throw "TTL AND REPEATS IS REQUIRED"}

    if (this.mesh) {
      let message = this._wrapMessage(data);
      EventBus.emit("MeshBroadcastStarted", {
        sender: this.macAddress,
        message: message,
        ttl, transmissions
      });

      this._addToQueue(() => {
        this.mesh.broadcast(this.crownstoneId, message, ttl, transmissions, target)
      });
    }
  }

  broadcastBurst(data: message, ttl: number, transmissions: number, target: crownstoneId = null) {
    if (ttl === undefined || transmissions === undefined) { throw "TTL AND TRANSMISSIONS IS REQUIRED"}

    if (this.mesh) {
      let message = this._wrapMessage(data);
      EventBus.emit("MeshBroadcastStarted", {
        sender: this.macAddress,
        message: message,
        ttl, transmissions
      });

      this._addToQueue(() => {
        this.mesh.broadcast(this.crownstoneId, message, ttl, 1, target);
      }, transmissions);
    }
  }

  _addToQueue(callback: callback, transmissions: number = 1) : boolean {
    let fitsInQueue = this.queue.add(callback, transmissions);
    this.queue.execute();

    if (!fitsInQueue) {
      EventBus.emit("QueueOverflow", {
        address: this.macAddress,
        transmissions: transmissions,
      });
    }

    return fitsInQueue;
  }


  configureQueue(options: {maxSize?: number, flushCount?: number, tickDurationMs?: number}) {
    if (options.maxSize)        { this.queue.setSize( options.maxSize );                 }
    if (options.flushCount)     { this.queue.flushPerExecution = options.flushCount;     }
    if (options.tickDurationMs) { this.queue.tickDurationMs    = options.tickDurationMs; }
  }

  advertise(data?) {
    if (this.mesh) {
      this.mesh.advertise(this.macAddress, this._wrapMessage(data));
    }
  }


  allowMeshRelay(source: crownstoneId, target: crownstoneId, ttl: number) : boolean {
    return true;
  }


  handleAdvertisement(from: macAddress, data, rssi: number) {
    // overwrite by child node
  }


  handleMeshMessage(source: crownstoneId, sentBy: macAddress, data, rssi: number, ttl: number, transmissions: number) {
    // overwrite by child node
  }


  _wrapMessage(data: message) : wrappedMessage {
    let wrappedMessage = {
      id: Util.getUUID(),
      relayId: null,
      data: data,
      path: [],
    }
    return wrappedMessage;
  }


}