# Mesh simulator

First install the dependencies

```angular2html
yarn
```

Then run the node server which will serve the GUI (if you want to use the gui)

```angular2html
npm start
```


You can run the examples in /examples/ by executing the example file with node

```js
node ./examples/basicExample/example.js

// or 

node ./examples/noGuiExample/example.js

// or 

node ./examples/topologyEditingExample/example.js
```


The simulator has 3 base classes you can inherit.

### Hub
This is just a Crownstone with a fancy icon. Part of the mesh.

### Crownstone
Part of the mesh.

### Asset
Something that is not in the mesh and just advertises.

These 3 things are called "nodes".
They can only talk over "connections".
If an asset is connected to a node, the node can hear the advertisements.
If nodes are connected via a connection, they can talk over the mesh.

# API

You construct the topology via a json file, or add nodes and connections manually.
Let's stick with the json file because thats how the examples work.

Take a look at the not scary topology in the simpleTopologyExample. This is the way you start out. 
If you want to make it more complex, edit it in the gui.

You tell the MeshSimulator to use the topology from a file, and you tell it for each type (HUB, CROWNSTONE, ASSET) which class to use.
This way you can provide your own classes to interact over the mesh.

Your custom classes will have to extend either the Hub, Crownstone or Asset classes provided by the simulator. Here's an example:

```js
const Sim = require("../../dist")

class CrownstoneNode extends Sim.Crownstone {
  // this custom Crownstone node class overrides the handleAdvertisement method to send a mesh burst broadcast each time
  // it receives an advertisement.
  handleAdvertisement(from, data, rssi) {
    this.broadcastBurst({macAddress: from, rssi}, 5, 1);
  }
}
```

There are a few methods you can override just like the example.

>### `start()`
> This is called for you when the simulation starts

>### `cleanup()`
> This is called for you when the simulation ends. You can use it to clean up any subscribers.

>### `broadcast(data: message, ttl: number, transmissions: number)`
> Use this to send a (singlepart) message over the mesh. The data can be anything you want.
> Transmissions here uses the mesh-repeat method. This means that each node that receives a broadcast with this amount of transmissions,
> they will also transmit it <number of transmissions> times when relaying. This is not used in Crownstone (at the moment). We use burst repeat. See next.


>### `broadcastBurst(data: message, ttl: number, transmissions: number)`
> This emulates how Crownstones send mesh messages. If transmissions is set to 5, It sends 5 messages, but when 
> another node receives it, it only relays it once. The mesh-repeat would also cause the relay to repeat.

>### `advertise(data?)`
> Used by assets. Advertises over ble. Data is freely available. Mac and RSSI are already delivered regardless of data.

>### `handleAdvertisement(from: macAddress, data, rssi: number)`
> You use this to respond to ble advertisements.

>### `handleMeshMessage(source: crownstoneId, sentBy: macAddress, data, rssi: number, ttl: number, transmissions: number)`
> You get to handle a mesh message that you received sentBy macaddress. It originated from the source crownstoneId (number).


>### `configureQueue(options: {maxSize?: number, flushCount?: number, tickDurationMs?: number})`
> You can configure the mesh message queue. Each mesh message is loaded into the queue. Each tick it will transmit <flushCount> messages.
> If you try to load more messages than maxSize allows, they will be discarded. The amount of transmissions does not matter for the queue maxSize.
> Default values are: 
> - maxSize = 20
> - flushCount = 3
> - tickDurationMs = 100


# Simulator

You have one class that does the magic.

## MeshSimulator

It does everything for you. Here's its API.

>### `allowNewTopology(path: string)`
> If you call this with a path, any changes to the topology from the GUI will be stored there.

>### `setTopologyFromFile(path, classMap)`
> This constructs the setup based on a json file. The classmap tells it how to use your custom classes for the basic types.
> See examples for usage.

>### `async run(seconds: number, precomputeSeconds: number = 0)`
> Run the simulation from start for the provided amount of seconds. In case you're looking into the effects of the message queue,
> you might need to use the precomputeSeconds argument to reach a steady-state before the statistics are gathered. 
> Each run is individual and starts everything all over again.

>### `async waitForConnection()`
> Awaitable that will pass once the GUI has connected. 

>### `report()`
> Returns the statistics object. 


# Hypertimer

All your classes inherit a timer which you can access via `this.meshTimer`. This is a hypertimer.

Docs are here: [https://www.npmjs.com/package/hypertimer](https://www.npmjs.com/package/hypertimer).

Clean up any intervals you set via the timer or your simulations will slow down if you run them more often.

# GUI

You have started the server by 
```angular2html
npm start
```

And you navigate (in Chrome, at your own risk otherwise) to 
```angular2html
http://localhost:3050
```

At the top you see "Connected!" or "Disconnected..." which means it can see a simulation websocket server (started by an example).

Then the buttons:
- Run 50s: run the simulation for 50 seconds, 0s precompute.
- Add Crownstone: If you allow the gui to change your topology, it will show up. On press, it will add a Crownstone.
- Add Edge: If you allow the gui to change your topology, it will show up. On press, you won't see anything immediately, but drag a new edge from a node to another node. The simulation will run immediately after.
- Delete selected: If you allow the gui to change your topology, it will show up. Delete selected things.
- Toggle Asset visibility: show or hide the Assets (if there are any). You can show it to connect an asset to nodes.
- Toggle Path visualization: choose between 2 modes of showing the path of a message.

### Network view

Once you have started the example and the GUI connects, it gets the topology and shows it. A simulation will run the first time. After a simulation has run
you can select a node. It will show you the percentages of the mesh messages you have received vs the ones that is has sent.
If you then click a node that has sent messages, the paths will be shown.

If you have your Crownstone to relay advertisements (like the examples), this will not take the initial scan loss into account since the percentages are based on
mesh messages it has sent, regardless of the reason it sent them.

## GUI code

The GUI code is kind of a mess. I think it could be nice to use next.js for this just so I can use react and typescript without all the 
browser crap. It's overkill to use next since all communication is done over Websockets, not REST, but it has everything
you need to build things out of the box.

Enter this part of the code at your own risk :)

# How it works
This basically simulates messages based on the 57% successrate from [https://docs.google.com/presentation/d/1BQMg4pdtNYwcdteqjYfvp4uTrk7ALhCbtwU-_2TUadM/edit#slide=id.g7ef327826b_0_0](https://docs.google.com/presentation/d/1BQMg4pdtNYwcdteqjYfvp4uTrk7ALhCbtwU-_2TUadM/edit#slide=id.g7ef327826b_0_0)

It is made to be also based on RSSI (per channel even!), but for now I have no data to base any RSSI related percentages on.

# Developing further or debugging

It's made in typescript. You can run the builder by:
```angular2html
npm run dev
```
for a continuous build or
```angular2html
npm run build
```
for a single build.

Don't forget to install the dependencies!
```angular2html
yarn
```

