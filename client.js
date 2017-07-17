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
    'test-rpc': function() { return secret; },
};

ws.on('open', () => ws.send(JSON.stringify(registerMessage)));

ws.on('message', router);

function router(messageString) {
    const message = JSON.parse(messageString);

    switch(message.type) {
        case 'RPC_ACTION':
            rpcManager.handleRPCAction(ws, name, message, actionMap);
            break;
        
        default:
            console.log(`Random message: ${message}`);
    }
}
