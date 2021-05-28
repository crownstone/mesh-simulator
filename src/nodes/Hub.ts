import {MeshNode} from "./base/MeshNode";

export class Hub extends MeshNode {
  type = "HUB";

  constructor(crownstoneId: number, macAddress?: macAddress) {
    super(macAddress);
    this.crownstoneId = crownstoneId;
  }

}