const crypto = require('crypto');

//case 1: hash = hash(pass)
//case 2: sign(privKey, {timestamp, name, playerId})=>signedData=>verify(pubKey, {timestamp, name, playerId})

const redis = require('redis').createClient();
const config = require('../config');
const promisify = require('util').promisify;
const Logger = require('../utils/Logger');
const User = require('../data/models/user');

const ROOMS_STATE_UNEXIST = 'unexistant'
const ROOMS_STATE_LOBBY = 'lobby';
const ROOMS_STATE_INGAME = 'ingame';
const ROOMS_STATE_ENDGAME = 'endgame';

const ROOMS_MODE_DEATHMATCH = 'dm'
const ROOMS_MODE_TEAM = 'tdm';
const ROOMS_MODE_CTF = 'ctf';
const ROOMS_MODE_CTP = 'cp';

const ROOMS_TYPES = [
    ROOMS_MODE_DEATHMATCH,
    ROOMS_MODE_TEAM,
    ROOMS_MODE_CTF,
    ROOMS_MODE_CTP
]

const ROOMS_USER_STATE_AFK = 0;
const ROOMS_USER_STATE_ONLINE = 1;

const ROOM_NAME_REGEX = /[A-Za-z0-9А-Яа-я\ \_\:\№\"\?\!\-\+\=\*\/\#\@\^\,\.\(\)\[\]\{\}\<\>\$\%\;\&]*/;
const MIN_ROOM_NAME_LENGTH = 0;
const MAX_ROOM_NAME_LENGTH = 20;
const MAX_PASSWORD_LENGTH = 20;

const rKeys = promisify(redis.keys.bind(redis));
const rHget = promisify(redis.hget.bind(redis));
const rHkeys = promisify(redis.hkeys.bind(redis));
const rHlen = promisify(redis.hlen.bind(redis));
const rHdel = promisify(redis.hdel.bind(redis));
const rHset = promisify(redis.hset.bind(redis));
const rHmset = promisify(redis.hmset.bind(redis));
const rHmget = promisify(redis.hmget.bind(redis));
const rDel = promisify(redis.del.bind(redis));
const rIncr = promisify(redis.incr.bind(redis));
const rGet = promisify(redis.get.bind(redis));
const rSet = promisify(redis.set.bind(redis));

class Rooms {
    /**
     * Init Rooms event processor
     * @param {SocketIO.Server} socketIOServer 
     */
    constructor(socketIOServer) {
        this.socketIOServer = socketIOServer;
        this.users = new Map();
    }

    async getRoomId(user) {
        return await rGet(`usr${user.id}RoomId`)
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
            let roomData = {
                roomKey: roomKey,
                password: !!passHash
            };

            let keys = await rHkeys(roomKey);

            let usersCount = 0;
            for (let key of keys) {
                if (key.match(/^usr(undefined|\d*)$/)) {
                    usersCount++;
                    if (!roomData.users) {
                        roomData.users = [];
                    }
                    roomData.users.push(await this.getUser(parseInt(key.split('usr').pop())));
                }
                else if (key !== 'password') {
                    roomData[key] = await rHget(roomKey, key);
                }
            }
            roomData.usersCount = usersCount;

            return roomData;
        }));

        socket.emit('/rooms/list', roomsList.reduce((prev, next) => {
            prev[next.roomKey] = next;
            delete prev[next.roomKey].roomKey;

            return prev;
        }, {}));
    }

    async getMy(socket, user) {
        let roomId = user.roomId;
        let roomKey = `room${roomId}`;
        let passHash = await rHget(roomKey, 'password');
        let roomData = {
            password: !!passHash
        };

        let keys = await rHkeys(roomKey);
        let usersCount = 0;
        for (let key of keys) {
            if (key.match(/^usr(undefined|\d*)$/)) {
                usersCount++;
                if (!roomData.users) {
                    roomData.users = [];
                }
                roomData.users.push(await this.getUser(parseInt(key.split('usr').pop())));
            }
            else if (key !== 'password') {
                roomData[key] = await rHget(roomKey, key);
            }
        }
        roomData.usersCount = usersCount;

        socket.emit('/rooms/my', roomKey, roomData);
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
                socket.emit('clientError', 'Room is not exist.');
            }
            else if (roomState == ROOMS_STATE_LOBBY) {
                let passHash = await rHget(`room${roomId}`, 'password');

                if (!passHash || password && passHash == crypto.createHash('sha256').update(password).digest('hex')) {
                    await rHset(`room${roomId}`, `usr${user.id}`, ROOMS_USER_STATE_ONLINE);
                    this.users.set(user.id, user);

                    //assign roomId for user
                    user.roomId = roomId;
                    await rSet(`usr${user.id}RoomId`, roomId)
                    Logger.info(`connecting room${user.roomId} usr${user.id}`);

                    // this.socketIOServer.in(`/room${roomId}`).emit('/rooms/connect', roomId, user);
                    // socket.emit('/rooms/connect', roomId, user);
                    this.socketIOServer.emit('/rooms/connect', `room${roomId}`, user);

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
                    socket.emit('clientError', 'Unauthorized', `room${roomId}`);
                }
            }
            else {
                socket.emit('clientError', 'Room state is not lobby.');
            }
        }
        else {
            socket.emit('clientError', `You're already in room room${user.roomId}`);
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
    async create(socket, user, roomData) {
        let { name, mapId, usersCount, mode, password } = roomData;
        if (!password || password == '') {
            password = null;
        }
        if (password && password.length > MAX_PASSWORD_LENGTH) {
            return socket.emit('clientError', `Password length should be < ${MAX_PASSWORD_LENGTH}`);
        }
        if (!mode) {
            mode = ROOMS_MODE_DEATHMATCH;
        }
        if (!ROOMS_TYPES.includes(mode)) {
            return socket.emit('clientError', `Invalid room mode ${mode}`);
        }
        if (!name) {
            return socket.emit('clientError', `Room name cannot be undefined`);
        }
        name = name.trim();
        if (!(name.length > MIN_ROOM_NAME_LENGTH && name.length <= MAX_ROOM_NAME_LENGTH)) {
            return socket.emit('clientError', `Room name length out of range (${MIN_ROOM_NAME_LENGTH} - ${MAX_ROOM_NAME_LENGTH})`);
        }
        if (!name.match(ROOM_NAME_REGEX)) {
            return socket.emit('clientError', `Room name may contain only space and specified symbols: A-Za-z0-9А-Яа-я_:№"?!-+=*/#@^,.()[]{}<>$%;&`);
        }

        if (!user.roomId) {
            if ([
                ROOMS_MODE_DEATHMATCH,
                ROOMS_MODE_TEAM,
                ROOMS_MODE_CTF,
                ROOMS_MODE_CTP
            ].includes(mode)) {
                let roomLastId = await rIncr('roomLastId');
                let passHash = false;
                user.roomId = roomLastId;

                Logger.info(`creating room${user.roomId}`, { mapId, name, volume: usersCount || config.defaultRoomVolume, state: ROOMS_STATE_LOBBY, mode, user: `usr${user.id}` });

                await rSet(`usr${user.id}RoomId`, roomLastId)

                await rHmset(`room${roomLastId}`,
                    `usr${user.id}`, ROOMS_USER_STATE_ONLINE,
                    'mapId', mapId,
                    'name', name,
                    'volume', usersCount || config.defaultRoomVolume,
                    'state', ROOMS_STATE_LOBBY,
                    'mode', mode,
                    ...(password && ['password', passHash = crypto.createHash('sha256').update(password).digest('hex')] || [])
                );

                this.users.set(user.id, user);

                this.socketIOServer.emit('/rooms/create', `room${roomLastId}`, {
                    name: name,
                    mapId: mapId,
                    mode: mode,
                    password: !!passHash
                });
                // socket.emit('/rooms/connect', user.roomId, user);
                this.socketIOServer.emit('/rooms/connect', `room${user.roomId}`, user);

                socket.join(`/room${user.roomId}`);
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
            socket.emit('clientError', `You're already in room room${user.roomId}`);
        }
    }

    /**
     * Leave room(event)
     * @param {SocketIO.Socket} socket 
     * @param {object} user 
     */
    async leave(socket, user) {
        if (user.roomId) {
            Logger.info(`leaving room${user.roomId} usr${user.id}`);
            await rHdel(`room${user.roomId}`, `usr${user.id}`);
            this.users.delete(user.id, user);

            this.socketIOServer.emit('/rooms/leave', `room${user.roomId}`, user);

            let keys = await rHkeys(`room${user.roomId}`);
            let usersCount = keys.filter(key => key.match(/^usr(undefined|\d*)$/)).length;
            if (usersCount === 0) {
                Logger.info(`removing empty room${user.roomId}`, user)
                await rDel(`room${user.roomId}`);
                this.socketIOServer.emit('/rooms/deleted', `room${user.roomId}`)
            }

            await rDel(`usr${user.id}RoomId`);
            user.roomId = null;
        }
        else {
            socket.emit('clientError', 'No roomId assigned to user');
        }
    }

    async getUser(id) {
        let user = this.users.get(id);
        if (user) {
            return user;
        }

        user = await User.findOne({ where: { id: id } });
        if (user) {
            user = user.dataValues;
            user.roomId = await this.getRoomId(user);
            this.users.set(user.id, user);
        }
        return user;
    }

    async step(socket, user) {

    }

    async useSkill(socket, user) {

    }

    async useItem(socket, user) {

    }
}

module.exports = Rooms;