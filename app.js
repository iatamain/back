require('./utils/expressAsyncErrors');
const express = require('express');
const socketio = require('socket.io');
const auth = require('./routes/auth');
const user = require('./routes/user');


const app = express();

app
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (req.method.toLowerCase() === 'options') {
            res.status(200).send();
        }
        next();
    })
    .use('/api', auth)
    .use('/api/user', user)
    .use(async (err, req, res, next) => {
        console.error(err);
        res.status(500).send({
            message: err.message,
            stack: err.stack
        });
    })
    .listen(8081, 'localhost');