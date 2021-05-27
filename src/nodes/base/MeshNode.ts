import {MeshNetwork} from "../../MeshNetwork";
import {Util} from "../../util/util";


type callback = () => void;
export class MeshNode {

  type: string;
  crownstoneId: string = null;
  macAddress: macAddress;
  mesh: MeshNetwork;
  isCrownstone = true;

  handled_messages = {};
  cleanupMethods : callback[] = []

  meshTimer : any;

  constructor(macAddress?: macAddress) {
    this.macAddress = macAddress ?? Util.getMacAddress();
  }

  _init()   {}

  /**
   * Used to set event listeners etc.
   */
  init()    {}
  cleanup() {}

  stop() {
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
    this._init();
    this.init();
  }


  broadcast(data: message, ttl: number, repeats: number = 0) {
    if (this.mesh) {
      this.mesh.broadcast(this.crownstoneId, this._wrapMessage(data), ttl, repeats)
    }
  }


  broadcastBurst(data: message, ttl: number, repeats: number = 5) {
    if (this.mesh) {
      let message = this._wrapMessage(data);
      for (let i = 0; i <= repeats; i++) {
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
    }
    return wrappedMessage;
  }


}