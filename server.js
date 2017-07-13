const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const responseCache = {};

const RPC = ' REMOTE_PROCEDURE_CALL';
let messageId = 1;

function createMessage(method, args) {
    const message = {
        type: RPC,
        id: messageId,
        method,
        args,
    };

    messageId += 1;

    return message;
}


const clientRegistry = {};

wss.on('connection', ws => {
    ws.on('message', message => router(ws, message));
});

function router(ws, messageString) {
    const message = JSON.parse(messageString);

    switch(message.type) {
        case 'REGISTER':
            clientRegistry[message.name] = ws;
    }
}


const intervalId = setInterval(() => {
    for (let clientName in clientRegistry) {
        clientRegistry[clientName].send('test-message');
    }
}, 5000);
