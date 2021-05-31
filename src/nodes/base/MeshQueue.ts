

export class MeshQueue {

  itemId = 0;
  queue : {callback: callback, transmissions: number, id: number}[] = [];
  maxSize : number;
  flushPerExecution : number;
  tickDurationMs : number = 100;
  timer: any;

  executing = false;
  executionTimeout = null;

  constructor(maxSize: number, flushPerExecution: number = 3) {
    this.maxSize = maxSize;
    this.flushPerExecution = flushPerExecution;
  }

  setSize(maxSize: number) {
    if (this.queue.length > maxSize) {
      this.queue = this.queue.slice(0,maxSize);
    }
    this.maxSize = maxSize;
  }

  add(callback: callback, transmissions = 1) : boolean {
    if (this.queue.length < this.maxSize) {
      this.queue.push({callback, transmissions, id: this.itemId++});
      return true;
    }
    return false;
  }

  reset() {
    this.queue = [];
    if (this.executionTimeout !== null) {
      this.timer.clearTimeout(this.executionTimeout);
    }
  }

  execute() {
    if (this.executing) { return; }

    this.executing = true;

    let itemsToRemove = 0;
    let index = 0;
    for (let i = 0; i < this.flushPerExecution; i++) {
      // handle queue not being large enough to accomodate the flushCount
      if (index >= this.queue.length) { break; }
      let itemToFire = this.queue[index];

      itemToFire.callback();
      itemToFire.transmissions -= 1;
      // if we do not have to transmit it any more, move on to the next item in the queue (index++)
      // we will also delete this item from the queue after the flush (via the itemsToRemove)
      if (itemToFire.transmissions === 0) {
        itemsToRemove++;
        index++;
      }
    }

    // remove spent items.
    for (let i = 0; i < itemsToRemove; i++) {
      this.queue.shift();
    }

    // schedule another execution if the queue is not empty.
    if (this.queue.length > 0) {
      this.executionTimeout = this.timer.setTimeout(() => {
        this.executing = false;
        this.executionTimeout = null;
        this.execute()
      }, this.tickDurationMs);
    }
    else {
      this.executing = false;
      this.executionTimeout = null;
    }
  }
}