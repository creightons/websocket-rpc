const WebSocket = require('ws');
const { ClientRpcManager } = require('./rpc-manager');


const name = process.argv[2];
const secret = process.argv[3];

const errors = [];
if (!name) { errors.push('Error: must pass in a client name');}
if (!secret) { errors.push('Error: must pass in a secret to share');}

if (errors.length > 0) {
    errors.forEach(err => console.log(err));
    process.exit();
}

const actionMap = {
    'test-rpc': () => Promise.resolve(secret),
};

const rpcManager = ClientRpcManager(name, actionMap);

function setupSocket(socketUrl) {
    const ws = new WebSocket(serverUrl);

    ws.on('open', () => {
        rpcManager.registerWithServer(ws);
        setTimeout(() => {
            rpcManager.runRpc(ws, 'server-side-procedure', [ 'test-1', 'test-2' ])
                .then(res => console.log(`RPC response from server: ${res}`))
                .then(() => rpcManager.runRpc(ws, 'procedure-that-errors', {}))
                .catch(err => console.log(`RPC error = ${err}`, err.stack));
        }, 2000);
    });

    ws.on('message', messageString => rpcManager.router(ws, messageString));

    ws.on('error', err => console.log(err));

    const reconnect = () => setTimeout(() => setupSocket(socketUrl), 2000);
    ws.on('close', () => {
        rpcManager.clearRpcRecordsForProcess(name);
        reconnect();
    });
}

const serverUrl = 'ws://localhost:8080';
setupSocket(serverUrl);
