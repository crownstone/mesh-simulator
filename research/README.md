The research folder is used for testing different scenarios. This is not part of the examples.

The topologyCreation is pretty much just a playground for creating topologies via the GUI.

The experiments folder has a runner which you can run via

```angular2html
node runner.js
```

The runner iterates over all topology ".json" files in the topologies folder and runs all scenarios on that topology (which are in the scenario's map).

It then writes some statistics to file.

To improve on the statistics gathering, look into the /util/analyse.js.

