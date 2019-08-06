const redis = require('redis').createClient();
const config = require('../config');

const ROOMS_STATE_UNEXIST = 'unexistant'
const ROOMS_STATE_LOBBY = 'lobby';
const ROOMS_STATE_INGAME = 'ingame';
const ROOMS_STATE_ENDGAME = 'endgame';

class Rooms {
    /**
     * Init Rooms event processor
     * @param {SocketIO.Server} socketIOServer 
     */
    constructor(socketIOServer){
        this.socketIOServer = socketIOServer;
    }

    /**
     * Get rooms list
     * @param {SocketIO.Socket} socket 
     */
    getList(socket){
        redis.keys('room[0-9]*', (err, rooms) => {
            socket.emit('/rooms/list', rooms);
        })
    }

    /**
     * Connect to room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     * @param {number} roomId 
     */
    connect(socket, user, roomId){
        roomId = roomId.split('room').pop();
        redis.hget(`room${roomId}`, `state`, (err, result) => {
            if(!result){
                socket.emit('/rooms/connect', 0);
                socket.emit('/rooms/state', ROOMS_STATE_UNEXIST);
            }
            if(result == ROOMS_STATE_LOBBY){
                redis.hset(`room${roomId}`, `usr${user.id}`, 1, (err, result) => {
                    this.socketIOServer.in(`/room${roomId}`).emit('/rooms/connect', user.id);
                    socket.emit('/rooms/connect', true);
                    socket.join(`/room${roomId}`);

                    redis.hkeys(`room${roomId}`, (err, keys) => {
                        keys = keys.filter(key => key.match(/^usr\d*$/));
                        redis.hget(`room${roomId}`, 'volume', (err, roomVolume) => {
                            if(keys.length >= roomVolume){
                                redis.hset(`room${roomId}`, 'state', ROOMS_STATE_INGAME, (err, result) => {
                                    this.socketIOServer.in(`/room${roomId}`).emit('/rooms/state', ROOMS_STATE_INGAME);
                                });
                            }
                        });
                    });    
                });
            }
            else {
                socket.emit('/rooms/connect', false);
                socket.emit('/rooms/state', result);
            }
        });
    }

    /**
     * Create room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     * @param {string} name 
     * @param {number} usersCount 
     */
    create(socket, user, name, usersCount){
        redis.incr('roomLastId', (err, roomLastId) => {
            redis.hmset(`room${roomLastId}`, 
                `usr${user.id}`, 1, 
                'name', name,
                'volume', usersCount || config.defaultRoomVolume,
                'state', ROOMS_STATE_LOBBY,
            (err, result) => {
                this.socketIOServer.emit('/rooms/create', `room${roomLastId}`);
            });
        })
    }

    /**
     * Leave room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     */
    leave(socket, user){
        if(user.roomId){
            redis.hdel(`room${user.roomId}`, `usr${user.id}`, (err, result) => {
                redis.hlen(`room${user.roomId}`, count => {
                    if(count == 0){
                        redis.del(`room${user.roomId}`, () => {
                            socket.emit('/rooms/leave', result);
                        });
                    }
                    else{
                        socket.emit('/rooms/leave', result);
                    }
                })
            });
        }
        else{
            socket.emit('clientError', 'No roomId assigned to user');
        }
    }
}

module.exports = Rooms;