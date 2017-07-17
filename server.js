const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const RpcManager = require('./rpc-manager');
const socketRegistry = {};

const rpcManager = RpcManager();


wss.on('connection', ws => {
    ws.on('message', message => router(ws, message));
});

function router(ws, messageString) {
    const message = JSON.parse(messageString);

    switch(message.type) {
        case 'REGISTER':
            socketRegistry[message.name] = ws;
            break;

        case 'RPC_RESPONSE':
            rpcManager.handleRPCResponse(message);
            break;
    }
}


const intervalId = setInterval(() => {
    let socket;
    for (let clientName in socketRegistry) {
        socket = socketRegistry[clientName];

        rpcManager.sendRPC(socket, clientName, 'test-rpc', [ 'some', 'random', 'data'])
            .then(res => console.log(`RPC response from '${clientName}': ${res}`))
            .catch(err => console.log(`RPC error = ${err}`));
    }
}, 5000);
