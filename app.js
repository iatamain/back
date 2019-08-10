require('./utils/expressAsyncErrors');
const express = require('express');
const socketio = require('socket.io');
const redis = require('redis');
const auth = require('./routes/auth');
const user = require('./routes/user');
const clan = require('./routes/clan');
const config = require('./config');
const utils = require('./utils');
const User = require('./data/models/user');
const Rooms = require('./events/rooms');

const app = express();

app
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .use((req, res, next) => {
        if (req.method.toLowerCase() === 'options') {
            res.status(200).send();
        }
        else {
            next();
        }
    })
    .use('/api', auth)
    .use((req, res, next) => {
        //TODO: Review different authentications(native, sns: vk, fb, ...)
        if (req.header('auth_key') && req.header('viewer_id')) {
            let authKey = req.header('auth_key');
            let viewerId = req.header('viewer_id');

            if (utils.checkAuthKeyVK(authKey, viewerId, config.vkApp.id, config.vkApp.secret)) {
                req.snsId = viewerId;
                req.snsName = 'vk';
                next();
            }
            else {
                res.status(401).send("auth_key doesn't match valid for this app&user");
            }
        }
        else {
            res.status(401).send('auth_key and viewer_id should be provided');
        }
    })
    .use('/api/user', user)
    .use('/api/clan', clan)
    .use(async (err, req, res, next) => {
        console.error(err);
        res.status(500).send({
            message: err.message,
            stack: err.stack
        });
    })
    .listen(8081, 'localhost');

//Temp. random subscriber/event generator for front
const socketApp = socketio();
socketApp.on('connection', async socket => {
    let authKey = socket.handshake.query['auth_key'];
    let viewerId = socket.handshake.query['viewer_id'];
    let usersStateUpdateInterval = null;
    if (utils.checkAuthKeyVK(authKey, viewerId, config.vkApp.id, config.vkApp.secret)) {
        const user = User.findOne({where: {snsId: viewerId}});
        if(!user){
            socketApp.disconnect();
        }
        const rooms = new Rooms(socketApp);

        socket
            .on('/rooms/list', (...params) => {
                rooms.getList(socket, user, ...params);
            })
            .on('/rooms/create', (...params) => {
                rooms.create(socket, user, ...params);
            })
            .on('/rooms/connect', (...params) => {
                rooms.connect(socket, user, ...params);
            })
            .on('/rooms/leave', () => {
                rooms.leave(socket, user);
            })

            .on('/room', async (roomId) => {
                socket.emit('/response', '/room', roomId);
                let roomUsersCount = ~~(Math.random() * 10);
                let roomUsers = [];
                for (let i = 0; i < roomUsersCount; i++) {
                    roomUsers.push({ nickname: Math.random().toString(16).split('.').pop(), state: {} });
                }
                socket.emit('/room/state', {
                    state: 'lobby',
                    users: roomUsers
                });
                await new Promise(resolve => setTimeout(resolve, 2000));
                roomUsersCount += ~~(Math.random() * 10);
                for (let i = roomUsers.length; i < roomUsersCount; i++) {
                    roomUsers.push({ nickname: Math.random().toString(16).split('.').pop(), state: {} });
                }

                socket.emit('/room/state', {
                    state: 'lobby',
                    users: roomUsers
                });
                await new Promise(resolve => setTimeout(resolve, 2000));
                usersStateUpdateInterval = setInterval(() => socket.emit('/room/state', {
                    state: 'ingame',
                    users: roomUsers.map(user => {
                        user.state = {
                            position: {
                                x: user.state.position ? user.state.position.x + ~~(Math.random() * 100) - 5 : 1,
                                y: user.state.position ? user.state.position.y + ~~(Math.random() * 100) - 5 : 1,
                            },
                            mouse: {
                                x: user.state.mouse ? user.state.mouse.x + ~~(Math.random() * 100) - 5 : 1,
                                y: user.state.mouse ? user.state.mouse.y + ~~(Math.random() * 100) - 5 : 1,
                            },
                            key: ~~(Math.random() * 10)
                        };
                        return user;
                    })
                }), 10);
            })
            .on('disconnect', () => clearInterval(usersStateUpdateInterval))
            .on('error', err => {
                console.error(err);
                clearInterval(usersStateUpdateInterval);
            });
    }
    else {
        socket.disconnect(true);
    }
});

socketApp.listen(4000);