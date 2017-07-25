const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const { ServerRpcManager } = require('./rpc-manager');
const socketRegistry = {};


const actionMap = {
    'server-side-procedure': () => Promise.resolve("procedure called on server"),
    'procedure-that-errors': () => Promise.reject('ERROR: This was on purpose'),
};

const rpcManager = ServerRpcManager(actionMap);

wss.on('connection', ws => {
    ws.on('message', message => rpcManager.router(ws, message, socketRegistry));

    ws.on('close', (args) => {
        for (let name in socketRegistry) {
            if (socketRegistry[name] === ws) {
                delete socketRegistry[name];
                rpcManager.clearRpcRecordsForProcess(name);
                break;
            }
        }
    });
});

const intervalId = setInterval(() => {
    let socket;
    for (let clientName in socketRegistry) {
        socket = socketRegistry[clientName];

        rpcManager.runRpc(socket, clientName, 'test-rpc', [ 'some', 'random', 'data'])
            .then(res => console.log(`RPC response from '${clientName}': ${res}`))
            .catch(err => console.log(`RPC error = ${err}`));
    }
}, 5000);
