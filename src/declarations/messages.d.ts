type message = any;

type MessageType = "MESH_BROADCAST" | "ADVERTISEMENT"

interface wrappedMessage {
  id: string,
  relayId: string,
  path: macAddress[],
  data: message
}