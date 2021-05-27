import {MeshNode} from "./base/MeshNode";

export class Crownstone extends MeshNode{
  type = "CROWNSTONE";

  constructor(crownstoneId: number, macAddress?: macAddress) {
    super(macAddress);
    this.crownstoneId = `${crownstoneId}`;
  }
}