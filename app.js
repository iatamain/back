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
        next();
    })
    .use('/api', auth)
    //.use(user)
    .listen(8081, 'localhost');