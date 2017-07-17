const { getDeferred } = require('./utils');

// Object to manage all RPC interactions
const _RpcManager = {
    init() {
        // Stores deferred objects generated when an RPC action is sent to a client
        this.rpcRecords = {};

        // Tracks all RPC messages sent to clients
        this.messageId = 1;
    },

    // Makes keys for stored RPC deferred objects
    getKey(id, client) {
       return  `${id}::${client}`;
    },

    // Sends an RPC action and returns a Promise
    sendRPC(socket, target, action, args) {
        const rpcMessage = {
            id: this.messageId,
            type: 'RPC_ACTION',
            action,
            target,
            args,
        };
        
        this.messageId += 1;

        const key = this.getKey(rpcMessage.id, target);

        // Uses a deferred object so that RPC actions can use promise chains
        const deferred = getDeferred();

        this.rpcRecords[key] = deferred;

        const stringifiedMessage = JSON.stringify(rpcMessage);

        socket.send(stringifiedMessage);

        return deferred.promise;
    },

    // Process RPC response and trigger Promises
    handleRPCResponse(response) {
        const { id, target, data } = response;

        const key = this.getKey(id, target);

        const deferred = this.rpcRecords[key];

        // Release the deferred object to prevent memory leaks
        delete this.rpcRecords[key];

        deferred.resolve(data);
    },

    // Calls the requested action in the actionMap and returns the result
    handleRPCAction(socket, appName, message, actionMap) {
        const { id, target, action, args } = message;

        console.log(`From ${target}: action = ${action}, args = ${args}.`);
        
        const result = actionMap[action]();

        const response = {
            type: 'RPC_RESPONSE',
            id,
            target: appName,
            data: result,
        };

        const stringifiedResponse = JSON.stringify(response);
        socket.send(stringifiedResponse);
    }
};

function RpcManager() {
    const manager = Object.create(_RpcManager);
    manager.init();
    return manager;
}

module.exports = RpcManager;
