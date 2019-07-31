const process = require('process');
const socketIOClient = require('socket.io-client');
console.log(process.argv)
socketIOClient('ws://localhost:4000', {
    transports: ['websocket'],
    query: { auth_key: process.argv[2], viewer_id: process.argv[3] }
})
    .emit('/room', 10)
    .on('/response', console.dir)
    .on('/room/state', console.dir)