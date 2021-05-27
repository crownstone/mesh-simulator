interface message {

}

type MessageType = "MESH_BROADCAST" | "ADVERTISEMENT"

interface wrappedMessage {
  id: string,
  relayId: string,
  data: message
}