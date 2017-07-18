const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');
const RpcManager = require('./rpc-manager');

const rpcManager = RpcManager();

const name = process.argv[2];
const secret = process.argv[3];

const errors = [];
if (!name) { errors.push('Error: must pass in a client name');}
if (!secret) { errors.push('Error: must pass in a secret to share');}

if (errors.length > 0) {
    errors.forEach(err => console.log(err));
    process.exit();
}

const registerMessage = { type: 'REGISTER', name };
    
const actionMap = {
    'test-rpc': () => secret,
};

ws.on('open', () => {
    ws.send(JSON.stringify(registerMessage))

    setTimeout(() => {
        rpcManager.sendRPCToServer(ws, 'server-side-procedure', [ 'test-1', 'test-2' ])
            .then(res => console.log(`RPC response from server: ${res}`))
            .catch(err => console.log(`RPC error = ${err}`, err.stack));
    }, 2000);
});

ws.on('message', messageString => rpcManager.clientRouter(ws, name, messageString, actionMap));
