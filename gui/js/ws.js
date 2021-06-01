
class SocketClient {
  client = null;
  pingTimeout;
  connected = false;
  connectionCallback = () => {}

  connect() {
    console.log("Connecting...")
    this.client = new WebSocket('ws://localhost:8080/');
    this.client.onopen = () => {
      this.connected = true;
      this.connectionCallback()
      console.log("Connected")
      this.heartbeat()
      EVENTBUS.emit("Connected")
    }
    this.client.onmessage = ({data}) => {
      this.heartbeat()
      if (data === "ping") {
        this.client.send("pong")
      }
      else {
        this.handleMessage(data);
      }
    }
    this.client.onclose = () => {
      EVENTBUS.emit("Disconnected")
      this.connected = false;
      console.log("Connection closed")
      clearTimeout(this.pingTimeout);
      setTimeout(() => { this.connect() }, 1000);
    }
  }

  async connectionEstablished() {
    if (this.connected) { return }
    return new Promise((resolve, reject) => {
      this.connectionCallback = resolve;
    })
  }

  send(message) {
    if (typeof message !== "string") {
      console.log("sending", JSON.stringify(message))
      this.client.send(JSON.stringify(message));
    }
    else {
      this.client.send(message);
    }
  }

  heartbeat() {
    clearTimeout(this.pingTimeout);

    // Use `WebSocket#terminate()`, which immediately destroys the connection,
    // instead of `WebSocket#close()`, which waits for the close timer.
    // Delay should be equal to the interval at which your server
    // sends out pings plus a conservative assumption of the latency.
    this.pingTimeout = setTimeout(() => {
      console.log("TERMINATING")
      this.client.terminate();
    }, 5000 + 1000);
  }

  handleMessage(data) {
    try {
      EVENTBUS.emit("Message", JSON.parse(data));
    }
    catch (err) {
      EVENTBUS.emit("Message", data);
    }
  }
}

const CLIENT = new SocketClient()

function init() {
  CLIENT.connect();
  initDOM();
  initVis()
}
