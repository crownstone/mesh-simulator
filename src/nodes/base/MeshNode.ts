import {MeshNetwork} from "../../MeshNetwork";
import {Util} from "../../util/Util";


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

  constructor(macAddress?: macAddress) {
    this.macAddress = macAddress ?? Util.getMacAddress();
  }


  /**
   * Used to set event listeners etc.
   */
  init()    {}
  cleanup() {}

  stop() {
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
    this.init();
  }


  broadcast(data: message, ttl: number, repeats) {
    if (ttl === undefined || repeats === undefined) { throw "TTL AND REPEATS IS REQUIRED"}

    if (this.mesh) {
      this.mesh.broadcast(this.crownstoneId, this._wrapMessage(data), ttl, repeats)
    }
  }



  broadcastBurst(data: message, ttl: number, transmissions: number) {
    if (ttl === undefined || transmissions === undefined) { throw "TTL AND TRANSMISSIONS IS REQUIRED"}

    if (this.mesh) {
      let message = this._wrapMessage(data);
      for (let i = 0; i < transmissions; i++) {
        this.mesh.broadcast(this.crownstoneId, message, ttl, 0);
      }
    }
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


  handleMeshMessage(source: crownstoneId, sentBy: macAddress, data, rssi: number, ttl: number, repeats: number) {
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