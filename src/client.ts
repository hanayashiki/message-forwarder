import { Packet } from './protocol';
import { client as WsClient, connection } from 'websocket';
import { EventEmitter } from "events";

const DEV = false;

interface ClientProps {
    serverIp?: string;
    serverPort?: number; 
}

const defaultClientProps: ClientProps = {
    serverIp: "localhost",
    serverPort: 4444,
}

interface ClientEventEmitter {
    on(event: "message", listener: (packet: Packet) => void): this;
}

export default class Client extends EventEmitter implements ClientEventEmitter {
    id: string;
    props: ClientProps;
    ws: WsClient;
    connection?: connection;
    resolves: Array<(connection) => void>;

    constructor(id: string, props: ClientProps = defaultClientProps) {
        super();
        this.id = id;
        this.props = Object.assign({...defaultClientProps}, props);
        this.ws = new WsClient();
        if (!id.match(/^[0-9a-zA-Z_]+$/)) {
            throw new Error('id must comprise [0-9a-zA-Z_]. ');
        }
        this.ws.connect(`ws://${this.props.serverIp}:${this.props.serverPort}/${id}`);

        this.ws.on("connect", connection => {
            if (DEV) console.log("connected")
            this.connection = connection;
            this.resolves.forEach(r => r(connection));
            this.resolves.length = 0;

            this.connection.on("close", () => {
                this.connection = undefined;
            });

            this.connection.on("message", (data) => {
                this.emit("message", JSON.parse(data.utf8Data!));
            });
        });
        
        this.resolves = [];
    }

    async send(id: string, data: string) {
        const packet: Packet = {
            senderId: this.id,
            targetId: id,
            data,
        }
        if (this.connection) {
            this.connection!.send(JSON.stringify(packet));
        } else {
            return new Promise(
                (resolve: (connection) => void) => this.resolves.push(resolve)
            ).then(connection => {
                if (DEV) console.log("send", packet);
                connection.send(JSON.stringify(packet));
            });
        }
    }


}