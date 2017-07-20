const { getDeferred } = require('./utils');
const SERVER_NAME = 'SERVER_PROCESS';
const RPC_ACTION = 'RPC_ACTION';
const RPC_RESPONSE = 'RPC_RESPONSE';
const RPC_ERROR = 'RPC_ERROR';

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

    sendRPCToClient(socket, target, action, args) {
        return this.sendRPC(socket, target, action, args);
    },

    sendRPCToServer(socket, action, args) {
        return this.sendRPC(socket, SERVER_NAME, action, args);
    },

    // Sends an RPC action and returns a Promise
    sendRPC(socket, target, action, args) {
        const rpcMessage = {
            id: this.messageId,
            type: RPC_ACTION,
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

    handleRPCError(response) {
        const { id, target, error } = response;

        const key = this.getKey(id, target);

        const deferred = this.rpcRecords[key];

        delete this.rpcRecords[key];

        deferred.reject(error);
    },

    handleRPCFromClient(socket, message, actionMap) {
        this.handleRPCAction(socket, SERVER_NAME, message, actionMap);
    },

    handleRPCFromServer(socket, clientName, message, actionMap) {
        this.handleRPCAction(socket, clientName, message, actionMap);
    },

    // Calls the requested action in the actionMap and returns the result
    handleRPCAction(socket, appName, message, actionMap) {
        const { id, target, action, args } = message;

        console.log(`Executor: ${target}, action: ${action}, args: ${args}.`);
        
        actionMap[action]()
            .then(result => {
                const response = {
                    type: RPC_RESPONSE,
                    id,
                    target: appName,
                    data: result,
                };

                const stringifiedResponse = JSON.stringify(response);
                socket.send(stringifiedResponse);
            })
            .catch(error => {
                const response = {
                    type: RPC_ERROR,
                    id,
                    target: appName,
                    error,
                };

                const stringifiedResponse = JSON.stringify(response);
                socket.send(stringifiedResponse);
            });
    },

    clientRouter(ws, name, messageString, actionMap) {
        const message = JSON.parse(messageString);

        switch(message.type) {
            case RPC_ACTION:
                this.handleRPCFromServer(ws, name, message, actionMap);
                break;

            case RPC_RESPONSE:
                this.handleRPCResponse(message);
                break;

            case RPC_ERROR:
                this.handleRPCError(message);
                break;

            default:
                console.log(`Random message: ${message}`);
        }
    },

    serverRouter(ws, messageString, socketRegistry, actionMap) {
        const message = JSON.parse(messageString);

        switch(message.type) {
            case 'REGISTER':
                socketRegistry[message.name] = ws;
                break;

            case RPC_ACTION:
                this.handleRPCFromClient(ws, message, actionMap);
                break;

            case RPC_RESPONSE:
                this.handleRPCResponse(message);
                break;

            case RPC_ERROR:
                this.handleRPCError(message);
                break;

            default:
                console.log(`Random message: ${message}`);
        }
    }
};

function RpcManager() {
    const manager = Object.create(_RpcManager);
    manager.init();
    return manager;
}

module.exports = RpcManager;
