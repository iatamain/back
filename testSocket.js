const process = require('process');
const socketIOClient = require('socket.io-client');
console.log(process.argv)
const socketClient = socketIOClient('ws://localhost:4000', {
    transports: ['websocket'],
    query: { auth_key: process.argv[2], viewer_id: process.argv[3] }
});

socketClient
    .emit('/rooms/create', 'test', 8)
    .on('/rooms/create', result => {
        console.log('/rooms/create', result);
        socketClient.emit('/rooms/users');
        socketClient.emit('/rooms/leave');
        socketClient.once('/rooms/leave', () => {
            socketClient.emit('/rooms/connect', 'room1')
        })
    });

socketClient
    .on('/rooms/list', console.log.bind(this, '/rooms/list'))
    .on('/rooms/connect', console.log.bind(this, '/rooms/connect'))
    .on('/rooms/state', console.log.bind(this, '/rooms/state'))
    .on('clientError', console.error.bind(this, 'clientError'))

socketClient.emit('/rooms/list');
