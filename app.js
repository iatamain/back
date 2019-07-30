require('./utils/expressAsyncErrors');
const express = require('express');
const socketio = require('socket.io');
const auth = require('./routes/auth');
const user = require('./routes/user');
const clan = require('./routes/clan');
const md5 = require('crypto');
const config = require('./config');

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
            let auth_key = req.header('auth_key');
            let viewer_id = req.header('viewer_id');
            const auth_key_check = md5.createHash('md5')
                .update(`${config.vkApp.id}_${viewer_id}_${config.vkApp.secret}`)
                .digest()
                .toString('hex');
            if (auth_key_check == auth_key) {
                req.snsId = viewer_id;
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