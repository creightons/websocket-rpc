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

    setRpcRecord(id, client, deferredObject) {
        if (typeof this.rpcRecords[client] !== 'object') {
            this.rpcRecords[client] = {};
        }
        this.rpcRecords[client][id] = deferredObject;
    },

    getRpcRecord(id, client) {
        let deferredObject;
        if (this.rpcRecords[client] && this.rpcRecords[client][id]) {
            deferredObject = this.rpcRecords[client][id];
            delete this.rpcRecords[client][id];
        }

        return deferredObject;
    },

    clearRpcRecordsForProcess(targetName) {
        delete this.rpcRecords[targetName];
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

        const deferred = getDeferred();

        this.setRpcRecord(rpcMessage.id, target, deferred);

        // Uses a deferred object so that RPC actions can use promise chains

        const stringifiedMessage = JSON.stringify(rpcMessage);

        socket.send(stringifiedMessage);

        return deferred.promise;
    },

    // Process RPC response and trigger Promises
    handleRPCResponse(response) {
        const { id, target, data } = response;

        const deferred = this.getRpcRecord(id, target);

        if (deferred) {
            deferred.resolve(data);
        }
        else {
            console.log('Error: received undeclared RPC response');
        }
    },

    handleRPCError(response) {
        const { id, target, error } = response;

        const deferred = this.getRpcRecord(id, target);

        if (deferred) {
            deferred.reject(error);
        }
        else {
            console.log('Error: received undeclared RPC error');
        }
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
