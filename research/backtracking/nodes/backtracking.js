const Sim = require("../../../dist")

class HubBackTracker extends Sim.Hub {
  start() {
    this.meshTimer.setInterval(() => { this.broadcast({_ignoreForStatistics: true, data:"IM_A_HUB"}, 20, 3); }, 1000)
  }
}

class HubBackTrackerOptimized extends HubBackTracker {
  allowMeshRelay(source, target, ttl) {
    return false;
  }
}


class CrownstoneAssetTracker extends Sim.Crownstone {
  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcastBurst({macAddress: from, rssi}, 10, 1, this.hubId)
    }
  }
}

class CrownstoneBackTracker extends Sim.Crownstone {
  hubId  = null;
  hubTTL = null;
  hubTTL_raw = null;

  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcastBurst({macAddress: from, rssi}, this.hubTTL, 1, this.hubId)
    }
  }

  handleMeshMessage(source, sentBy, data, rssi, ttl, transmissions) {
    if (typeof data === 'object' && data.data === "IM_A_HUB") {
      this.hubId = source;
      // the +1 is there to indicate that we don't send messages with ttl = 0;
      let hopsRequired = 20 - ttl + 1;
      if (this.hubTTL_raw === null) {
        this.hubTTL_raw = hopsRequired;
      }
      let factor = 0.2;
      this.hubTTL_raw = factor*hopsRequired + (1-factor)*this.hubTTL_raw;

      // the - 0.01 is to get rid of Javascript rounding errors like 3.00000000004
      this.hubTTL = Math.ceil(this.hubTTL_raw-0.01)
    }
  }
}


class CrownstoneBackTrackerMoreHops extends CrownstoneBackTracker {
  handleAdvertisement(from, data, rssi) {
    if (this.hubId !== null) {
      this.broadcastBurst({macAddress: from, rssi}, this.hubTTL + 1, 1, this.hubId)
    }
  }
}

class CrownstoneBackTrackerMoreHopsOptimized extends CrownstoneBackTrackerMoreHops {
  allowMeshRelay(source, target, ttl) {
    if (target === this.hubId) {
      if (ttl >= this.hubTTL) {
        return true
      }
    }
    else if (target === null) {
      return true;
    }
    return false;
  }
}




module.exports = {
  CrownstoneAssetTracker,
  CrownstoneBackTracker,
  CrownstoneBackTrackerMoreHops,
  CrownstoneBackTrackerMoreHopsOptimized,

  HubBackTracker,
  HubBackTrackerOptimized
}