const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const socketRegistry = {};

function getDeferred() {
    const deferred = {};

    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    return deferred;
}

// Object to manage all RPC interactions
const rpcManager = {

    // Stores deferred objects generated when an RPC action is sent to a client
    rpcRecords: {},

    // Tracks all RPC messages sent to clients
    messageId: 1,

    // Makes keys for stored RPC deferred objects
    getKey(id, client) {
       return  `${id}::${client}`;
    },

    // Sends an RPC action and returns a Promise
    sendRPC(clientName, action, args) {
        const rpcMessage = {
            id: this.messageId,
            type: 'RPC_ACTION',
            target: clientName,
            action,
            args,
        };
        
        this.messageId += 1;

        const key = this.getKey(rpcMessage.id, clientName);

        // Uses a deferred object so that RPC actions can use promise chains
        const deferred = getDeferred();

        this.rpcRecords[key] = deferred;

        const stringifiedMessage = JSON.stringify(rpcMessage);

        socketRegistry[clientName].send(stringifiedMessage);

        return deferred.promise;
    },

    // Process RPC response and trigger Promises
    handleRPCResponse(response) {
        const { id, clientName, data } = response;

        const key = this.getKey(id, clientName);

        const deferred = this.rpcRecords[key];

        // Release the deferred object to prevent memory leaks
        delete this.rpcRecords[key];

        deferred.resolve(data);
    }
};

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
    for (let clientName in socketRegistry) {
        rpcManager.sendRPC(clientName, 'test-rpc', [ 'some', 'random', 'data'])
            .then(res => console.log(`RPC response from '${clientName}': ${res}`))
            .catch(err => console.log(`RPC error = ${err}`));
    }
}, 5000);
