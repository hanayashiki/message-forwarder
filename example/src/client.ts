import Client, {Packet} from "message-forwarder";


const client = new Client(process.env.CLIENT_ID);

client.send(process.env.PEER_ID, "114514");
client.on("message", (packet: Packet) => {
    console.log(packet);
})
