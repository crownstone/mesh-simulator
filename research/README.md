The research folder is used for testing different scenarios. This is not part of the examples.

## Creating a topology
The topologyCreation is pretty much just a playground for creating topologies via the GUI.
```
node ./research/topologyCreation/run.js
```

## Scenario's and experiments
The experiments folder has a runner which you can run via

```angular2html
node ./research/topologyCreation/runner.js
```

The runner iterates over all topology ".json" files in the topologies folder and runs all scenarios on that topology (which are in the scenario's map).

It then writes some statistics to file.

To improve on the statistics gathering, look into the ./research/topologyCreation/util/analyse.js.


## Rssi from hub
Since we have a topology and a message counter, we can determine the loss% we have from all nodes towards the hub. 
This does not take topology (and thus path of the message, or repeats) into account and cannot be used to get RSSI-drop estimates.

There is a calculateFromHubData.js file that takes the topology and statistics from your hub (defined by the hubData.json in <projectRoot>/util/credentials) and makes a list
of the nodes that are 0 hops from the hub, takes their rssi's and calculates the loss percentage.

Due to heavy connectivity and (currently) no rssi averaging on the Crownstone side in these messages we get things like this:

```
Rssi: -44 Loss: [ '11.29' ] %
Rssi: -48 Loss: [ '0.00' ] %
Rssi: -67 Loss: [ '9.84' ] %
Rssi: -69 Loss: [ '11.11', '9.52' ] %
Rssi: -74 Loss: [ '6.35', '9.52' ] %
Rssi: -75 Loss: [ '11.11' ] %
Rssi: -77 Loss: [ '13.51', '6.35' ] %
Rssi: -78 Loss: [ '12.70' ] %
Rssi: -79 Loss: [ '3.17', '6.35' ] %
Rssi: -81 Loss: [ '4.76' ] %
Rssi: -82 Loss: [ '4.76' ] %
Rssi: -84 Loss: [ '6.35' ] %
Rssi: -85 Loss: [ '14.06' ] %
Rssi: -87 Loss: [ '4.92', '8.20', '6.35' ] %
Rssi: -88 Loss: [ '7.94' ] %
```