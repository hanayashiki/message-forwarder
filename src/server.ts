import http from 'http';
import { server as WebSocketServer, connection } from 'websocket';
import { Packet } from './protocol';

const server = http.createServer();
server.listen(parseInt(process.env.PORT!), process.env.IP!);
console.log(`Running on ${process.env.IP!}:${parseInt(process.env.PORT!)}`)

const wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

const clients = new Map<string, connection>();

wsServer.on('request', request => {
    const connection = request.accept();
    const clientId = request.resource.slice(1);
    const logPrefix = `[${clientId}] `;
    console.log(logPrefix + `connection from ${connection.socket.remoteAddress}:${connection.socket.remotePort}`);

    if (clients.has(clientId)) {
        console.log("ID exists", clientId);
        connection.close(4400, "ID exists");
        return;
    }

    clients.set(clientId, connection);

    connection.on("message", data => {
        const packet: Packet = JSON.parse(data.utf8Data!);
        packet.senderId = clientId;
        console.log(logPrefix, packet);
        if (!clients.has(packet.targetId)) {
            console.warn(logPrefix + `Has sent to an unknown user ${packet.targetId}`)
        }
        clients.get(packet.targetId)?.send(JSON.stringify(packet));
    });

    connection.on("close", (code, desc) => {
        clients.delete(clientId);
    })
})