const crypto = require('crypto');

//case 1: hash = hash(pass)
//case 2: sign(privKey, {timestamp, name, playerId})=>signedData=>verify(pubKey, {timestamp, name, playerId})


const redis = require('redis').createClient();
const config = require('../config');
const promisify = require('util').promisify;

const ROOMS_STATE_UNEXIST = 'unexistant'
const ROOMS_STATE_LOBBY = 'lobby';
const ROOMS_STATE_INGAME = 'ingame';
const ROOMS_STATE_ENDGAME = 'endgame';

const ROOMS_MODE_DEATHMATCH = 'deathmatch'
const ROOMS_MODE_TEAM = 'team';
const ROOMS_MODE_CTF = 'ctf';
const ROOMS_MODE_CTP = 'ctp';

const ROOMS_USER_STATE_AFK = 0;
const ROOMS_USER_STATE_ONLINE = 1;


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
    constructor(socketIOServer) {
        this.socketIOServer = socketIOServer;
    }

    /**
     * Get rooms list
     * @param {SocketIO.Socket} socket 
     */
    async getList(socket) {
        let roomsKeys = (await rKeys('room[0-9]*')) || [];
        let roomsList = await Promise.all(roomsKeys.map(async (roomKey) => {
            let roomId = roomKey.split('room').pop();
            let passHash = await rHget(`room${roomId}`, 'password');

            return {
                roomKey: roomKey,
                password: !!passHash
            };
        }));

        socket.emit('/rooms/list', await roomsList.reduce(async (prev, next) => {
            let keys = await rHkeys(next.roomKey);
            prev[next.roomKey] = { password: next.password };
            let usersCount = 0;
            for (let key of keys) {
                if (key.match(/^usr(undefined|\d*)$/)) {
                    usersCount++;
                }
                else {
                    prev[next.roomKey][key] = await rHget(next.roomKey, key);
                }
            }
            prev[next.roomKey].usersCount = usersCount;

            return prev;
        }, {}));
    }

    //map:
    //'(x^2+y^2) = 61'                              <-Invalid JS
    //'(Math.pow($x,2)+Math.pow($y,2)) == $objSize' <-Describes overlay only
    //-A------B---C--D <-A: start point, B-C: circular block, D: end point 
    //----a----------- <-collide: false, true  detection
    //--------a------- <-collide: true,  true  detection
    //----------a----- <-collide: false, false detection


    /**
     * Connect to room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     * @param {number} roomId 
     */
    async connect(socket, user, roomId, password = null) {
        if (!user.roomId) {
            roomId = roomId.split('room').pop();

            let roomState = await rHget(`room${roomId}`, `state`);
            if (!roomState) {
                socket.emit('/rooms/connect', false);
                socket.emit('/rooms/state', ROOMS_STATE_UNEXIST);
            }
            else if (roomState == ROOMS_STATE_LOBBY) {
                let passHash = await rHget(`room${roomId}`, 'password');
                console.log('passHash', roomId, passHash);

                if (!passHash || password && passHash == crypto.createHash('sha256').update(password).digest('hex')) {
                    await rHset(`room${roomId}`, `usr${user.id}`, ROOMS_USER_STATE_ONLINE);
                    //assign roomId for user
                    user.roomId = roomId;

                    this.socketIOServer.in(`/room${roomId}`).emit('/rooms/connect', user.id);
                    socket.emit('/rooms/connect', true);
                    socket.join(`/room${roomId}`);
                    let keys = await rHkeys(`room${roomId}`);
                    keys = keys.filter(key => key.match(/^usr(undefined|\d*)$/));
                    let roomVolume = await rHget(`room${roomId}`, 'volume');

                    if (keys.length >= roomVolume) {
                        await rHset(`room${roomId}`, 'state', ROOMS_STATE_INGAME);
                        this.socketIOServer.in(`/room${roomId}`).emit('/rooms/state', ROOMS_STATE_INGAME);
                    }
                }
                else {
                    socket.emit('clientError', 'unauthorized');
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
     * @param {string} mapId
     * @param {number} usersCount 
     * @param {string} mode
     * @param {string|null} password 
     */
    async create(socket, user, name, mapId, usersCount, mode = ROOMS_MODE_DEATHMATCH, password = null) {
        if (!mode) {
            mode = ROOMS_MODE_DEATHMATCH;
        }
        if (!user.roomId) {
            if ([
                ROOMS_MODE_DEATHMATCH,
                ROOMS_MODE_TEAM,
                ROOMS_MODE_CTF,
                ROOMS_MODE_CTP
            ].includes(mode)) {
                let roomLastId = await rIncr('roomLastId');
                user.roomId = roomLastId;
                await rHmset(`room${roomLastId}`,
                    `usr${user.id}`, ROOMS_USER_STATE_ONLINE,
                    'mapId', mapId,
                    'name', name,
                    'volume', usersCount || config.defaultRoomVolume,
                    'state', ROOMS_STATE_LOBBY,
                    'mode', mode,
                    ...(password && ['password', crypto.createHash('sha256').update(password).digest('hex')] || [])
                );
                console.log('password', roomLastId, await rHget(`room${roomLastId}`, 'password'));
                this.socketIOServer.emit('/rooms/create', `room${roomLastId}`);
            }
            else {
                socket.emit('clientError', `mode should be one of ${[
                    ROOMS_MODE_DEATHMATCH,
                    ROOMS_MODE_TEAM,
                    ROOMS_MODE_CTF,
                    ROOMS_MODE_CTP
                ].join(', ')}`)
            }
        }
        else {
            socket.emit('/rooms/create', `room${roomLastId}`);
        }
    }

    /**
     * Leave room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     */
    async leave(socket, user) {
        if (user.roomId) {
            let removeResult = await rHdel(`room${user.roomId}`, `usr${user.id}`);

            let keys = await rHkeys(`${user.roomId}`);
            let usersCount = keys.filter(key => key.match(/^usr(undefined|\d*)$/)).length;
            if (usersCount === 0) {
                console.log(`removing empty room${user.roomId}`);
                await rDel(`room${user.roomId}`);
            }
            socket.emit('/rooms/leave', removeResult, `room${user.roomId}`);
            user.roomId = null;
            this.socketIOServer.in(`/room${user.roomId}`).emit('/rooms/leave', user.id);
        }
        else {
            socket.emit('clientError', 'No roomId assigned to user');
        }
    }

    async step(socket, user) {

    }

    async useSkill(socket, user) {

    }

    async useItem(socket, user) {

    }
}

module.exports = Rooms;