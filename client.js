const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

const registerMessage = {
    type: 'REGISTER',
    name: 'test-client',
}
    
ws.on('open', () => ws.send(JSON.stringify(registerMessage)));
ws.on('message', message => console.log(message));
