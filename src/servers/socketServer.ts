const ws = require('ws');

export class SocketServer {

  _connected = false;
  _socket = null;
  _messageHandler;

  _connectionCallbacks = [];

  constructor(messageHandler = () => {}) {
    this._messageHandler = messageHandler;
  }

  createServer() {
    this._socket = new ws.Server({ port: 8080 });
    this._socket.on('connection', (ws) => {
      console.log("Got a connection");
      ws.isAlive = true;
      this._connected = true;
      this._connectionCallbacks.forEach((callback) => { callback() });
      this._connectionCallbacks = [];
      ws.on('message', (data) => {
        ws.isAlive = true;
        if (data !== 'pong') {
          this._handleMessage(data);
        }
      })
    });


    const interval = setInterval(() => { this._ping() }, 5000);

    this._socket.on('close', function close() {
      console.log("Connection was closed");
      clearInterval(interval);
    });
  }

  async connectionEstablished() {
    if (this._connected) { return; }
    return new Promise((resolve, reject) => {
      this._connectionCallbacks.push(resolve);
    })
  }

  setMessageHandler(handler) {
    this._messageHandler = handler;
  }

  _ping() {
    if (this._connected === false) { return; }

    this._socket.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log("Terminating client due to no pong")
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.send('ping');
    });
  }

  send(data) {
    if (typeof data !== 'string') {
      try {
        let stringifiedData = JSON.stringify(data)
        this._send(stringifiedData);
      }
      catch (err) {
        console.warn("FAILED TO STRINGIFY", err)
      }
    }
    else {
      this._send(data);
    }
  }

  _send(data : string) {
    if (this._connected === false) { return; }

    this._socket.clients.forEach((ws) => {
      ws.send(data);
    });
  }

  _handleMessage(data) {
    try {
      let dataObj = JSON.parse(data);
      this._messageHandler(dataObj)
    }
    catch (err) {
      this._messageHandler(data);
    }
  }

}