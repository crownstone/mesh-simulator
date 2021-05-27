import {MeshNode} from "./base/MeshNode";

export class Asset extends MeshNode {
  type = "ASSET";
  isCrownstone = false;

  intervalId = null;
  payload:    object | callback | undefined;
  intervalMs: number;

  constructor(intervalMs: number, macAddress?: macAddress, payload?: object | callback ) {
    super(macAddress);
    this.intervalMs = intervalMs;
    this.payload = payload;
  }

  _init() {
    this.meshTimer.setTimeout(() => {
      this.intervalId = this.meshTimer.setInterval(() => {
        if (typeof this.payload === 'function') {
          this.advertise(this.payload());
        }
        else {
          this.advertise(this.payload);
        }
      }, this.intervalMs);
    }, Math.random()*this.intervalMs);
  }

  cleanup() {
    this.meshTimer.clearInterval(this.intervalId);
    this.intervalId = null;
  }
}