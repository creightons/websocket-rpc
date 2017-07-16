const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

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
    
function handleRPCAction(message) {
    const { id, action, args } = message;

    console.log(`From server: action = ${action}, args = ${args}.`);
    
    const response = {
        type: 'RPC_RESPONSE',
        id,
        clientName: name,
        data: secret,
    };

    const stringifiedResponse = JSON.stringify(response);
    ws.send(stringifiedResponse);
}

ws.on('open', () => ws.send(JSON.stringify(registerMessage)));

ws.on('message', router);

function router(messageString) {
    const message = JSON.parse(messageString);

    switch(message.type) {
        case 'RPC_ACTION':
            handleRPCAction(message);
            break;
        
        default:
            console.log(`Random message: ${message}`);
    }
}
