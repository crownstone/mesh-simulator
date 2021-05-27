import {Crownstone} from "./Crownstone";

export class MeshBroadcaster extends Crownstone {
  type = "ASSET";
  intervalId = null;

  payload:    object | callback;
  intervalMs: number;
  ttl: number;
  repeat: number;

  constructor(crownstoneId: number, intervalMs: number, macAddress?: macAddress, payload?: object | callback, ttl : number = 5, repeat: number = 0) {
    super(crownstoneId, macAddress);
    this.intervalMs = intervalMs;
    this.payload = payload;
    this.ttl = ttl;
    this.repeat = repeat;
  }

  _init() {
    this.meshTimer.setTimeout(() => {
      this.intervalId = this.meshTimer.setInterval(() => {
        if (typeof this.payload === 'function') {
          this.broadcast(this.payload(), this.ttl, this.repeat);
        }
        else {
          this.broadcast(this.payload, this.ttl, this.repeat);
        }
      }, this.intervalMs);
    }, Math.random()*this.intervalMs);
  }

  cleanup() {
    this.meshTimer.clearInterval(this.intervalId);
    this.intervalId = null;
  }
}