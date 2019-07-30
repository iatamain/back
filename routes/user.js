const router = require('express').Router();
const sequelize = require('sequelize');

const User = require('../data/models/user');
const Login = require('../data/models/login');

router
    .put('/update', async (req, res) => {
        let params = req.userId
            ? { id: req.userId }
            : { snsId: req.snsId, snsName: req.snsName };
        let user = await User.findOne({ where: params });
        params = Object.assign(req.body, params);
        if (params.firstName || params.lastName) {
            params.nickname = [params.firstName || '', params.lastName || ''].join(' ').trim();
        }
        let result = user ? user.dataValues : {};
        if (user) {
            await user.update(params);
            result.loginsCount = user
            let loginsCount = await Login.count();
            let startOfDay = new Date();
            startOfDay.setHours(23, 59, 0, 0);
            let loginsCountToday = await Login.count({
                where: {
                    time: { [sequelize.Op.gt]: startOfDay.getTime() }
                }
            })

            result = Object.assign(result, {
                loginsCount: loginsCount,
                isFirstLogin: loginsCount === 0,
                isFirstLoginToday: loginsCountToday === 0
            });

        }
        else {
            user = await User.create(params);
            await Login.create({
                userId: user.id,
                time: Date.now(),
                ip: req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            });
            result = Object.assign(user.dataValues, { loginsCount: 1, isFirstLogin: true, isFirstLoginToday: true });
        }
        res.status(200).send(result);
    })
    .get('/self', async (req, res) => {
        let params = req.userId
            ? { id: req.userId }
            : { snsId: req.snsId, snsName: req.snsName };

        let user = await User.findOne({ where: params });
        if (user) {
            res.status(200).send(user);
        }
        else {
            res.status(404).send('User not found');
        }
    })
    .get('/sns/:snsId', async (req, res) => {
        let user = await User.findOne({
            where: {
                snsName: req.snsName,
                snsId: req.params.snsId
            }
        });
        if (user) {
            res.status(200).send(user);
        }
        else {
            res.status(404).send('User not found');
        }
    })
    .post('/sns-batch', async (req, res) => {
        if (req.body.snsIds instanceof Array) {
            let users = await User.findAll({
                where: {
                    snsName: req.snsName,
                    snsId: { [sequelize.Op.in]: req.body.snsIds }
                }
            });
            let result = req.body.snsIds.reduce((prev, next) => {
                prev[next] = users.find(c => c.snsId === next) || null;
                return prev;
            }, {});
            res.status(200).send(result);
        }
        else {
            res.status(400).send('snsIds should be provided and be array!')
        }
    })

module.exports = router;