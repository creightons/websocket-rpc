const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const RpcManager = require('./rpc-manager');
const socketRegistry = {};

const rpcManager = RpcManager();

const actionMap = {
    'server-side-procedure': () => "procedure called on server",
};

wss.on('connection', ws => {
    ws.on('message', message => rpcManager.serverRouter(ws, message, socketRegistry, actionMap));
});

const intervalId = setInterval(() => {
    let socket;
    for (let clientName in socketRegistry) {
        socket = socketRegistry[clientName];

        rpcManager.sendRPCToClient(socket, clientName, 'test-rpc', [ 'some', 'random', 'data'])
            .then(res => console.log(`RPC response from '${clientName}': ${res}`))
            .catch(err => console.log(`RPC error = ${err}`));
    }
}, 5000);
