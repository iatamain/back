const redis = require('redis').createClient();
const config = require('../config');
const promisify = require('util').promisify;

const ROOMS_STATE_UNEXIST = 'unexistant'
const ROOMS_STATE_LOBBY = 'lobby';
const ROOMS_STATE_INGAME = 'ingame';
const ROOMS_STATE_ENDGAME = 'endgame';

const rKeys = promisify(redis.keys.bind(redis));
const rHget = promisify(redis.hget.bind(redis));
const rHkeys = promisify(redis.hkeys.bind(redis));
const rHlen = promisify(redis.hlen.bind(redis));
const rHdel = promisify(redis.hdel.bind(redis));
const rHset = promisify(redis.hset.bind(redis));
const rHmset = promisify(redis.hmset.bind(redis));
const rDel = promisify(redis.del.bind(redis));
const rIncr = promisify(redis.incr.bind(redis));

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
    async getList(socket){
        socket.emit('/rooms/list', await rKeys('room[0-9]*'));
    }

    /**
     * Connect to room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     * @param {number} roomId 
     */
    async connect(socket, user, roomId){
        if(!user.roomId){
            roomId = roomId.split('room').pop();

            let roomState = await rHget(`room${roomId}`, `state`);
            if(!roomState){
                socket.emit('/rooms/connect', false);
                socket.emit('/rooms/state', ROOMS_STATE_UNEXIST);
            }
            else if (roomState == ROOMS_STATE_LOBBY){
                await rHset(`room${roomId}`, `usr${user.id}`, 1);
                //assign roomId for user
                user.roomId = roomId;

                this.socketIOServer.in(`/room${roomId}`).emit('/rooms/connect', user.id);
                socket.emit('/rooms/connect', true);
                socket.join(`/room${roomId}`);
                let keys = await rHkeys(`room${roomId}`);
                keys = keys.filter(key => key.match(/^usr\d*$/));
                let roomVolume = await rHget(`room${roomId}`, 'volume');
    
                if(keys.length >= roomVolume){
                    await rHset(`room${roomId}`, 'state', ROOMS_STATE_INGAME);
                    this.socketIOServer.in(`/room${roomId}`).emit('/rooms/state', ROOMS_STATE_INGAME);
                }
    
            }
            else {
                socket.emit('/rooms/connect', false);
                socket.emit('/rooms/state', roomState);
            }    
        }
        else {
            socket.emit('/rooms/connect', false);
        }
    }

    /**
     * Create room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     * @param {string} name 
     * @param {number} usersCount 
     */
    async create(socket, user, name, usersCount){
        if(!user.roomId){
            let roomLastId = await rIncr('roomLastId');
            user.roomId = roomLastId;
            await rHmset(`room${roomLastId}`,
                `usr${user.id}`, 1, 
                'name', name,
                'volume', usersCount || config.defaultRoomVolume,
                'state', ROOMS_STATE_LOBBY
            );
            this.socketIOServer.emit('/rooms/create', `room${roomLastId}`);    
        }
        else{
            socket.emit('/rooms/create', `room${roomLastId}`);
        }
    }

    /**
     * Leave room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     */
    async leave(socket, user){
        if(user.roomId){
            let removeResult = await rHdel(`room${user.roomId}`, `usr${user.id}`);
            let roomsCount = await rHlen(`room${user.roomId}`);
            if(roomsCount === 0){
                await rDel(`room${user.roomId}`);
            }
            user.roomId = null;
            socket.emit('/rooms/leave', removeResult);
        }
        else{
            socket.emit('clientError', 'No roomId assigned to user');
        }
    }

    async step(socket, user){

    }

    async useSkill(socket, user){
           
    }

    async useItem(socket, user){

    }   
}

module.exports = Rooms;