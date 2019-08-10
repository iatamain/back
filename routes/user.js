const router = require('express').Router();
const sequelize = require('sequelize');

const utils = require('../utils');

const User = require('../data/models/user');
const Login = require('../data/models/login');

const DAY_MILLISECONDS = 86400000;

const readOnlyUserFields = [
    'rank',
    'lvl',
    'experience',
    'amountCrystal',
    'gotDailyBonusAt',
    'progress',
    'achivements',
    'statistics'
];

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
        let paramsKeys = Object.keys(params);
        for (let key of paramsKeys) {
            if (readOnlyUserFields.includes(key)) {
                delete params[key];
            }
        }

        let result = user ? user.dataValues : {};
        if (user) {
            await user.update(params);

            let loginsCount = await Login.count();
            let startOfDay = utils.getStartOfDay(new Date().setHours(0, 0, 0, 0));
            let loginsCountToday = await Login.count({
                where: {
                    time: { [sequelize.Op.gt]: startOfDay }
                }
            });

            result = Object.assign(result, {
                loginsCount: loginsCount,
                isFirstLogin: loginsCount === 0,
                isFirstLoginToday: loginsCountToday === 0,
                isGetDailyBonus: user.gotDailyBonusAt >= startOfDay
            });
        }
        else {
            params.rankingPos = await User.count();
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
    .post('/get-daily-bonus', async (req, res) => {
        let user = await User.findOne({
            where: {
                snsName: req.snsName,
                snsId: req.snsId
            }
        });
        let currentTime = Date.now();
        let startOfDay = new Date().setHours(0, 0, 0, 0);

        if (user.gotDailyBonusAt <= startOfDay) {
            let loginsTimes = await Login.findAll({
                attributes: ['time'],
                where: {userId: user.id},
                order: [['time', 'desc']]
            });
            loginsTimes = loginsTimes.map(c => c.time);
console.log('loginsTimes', loginsTimes);
            let prevConcurrentTime = utils.getStartOfDay();
            let concurrentTimes = 1;
            for(let i = 0; i < loginsTimes.length; i++){
                if(loginsTimes[i] < utils.getStartOfDay(prevConcurrentTime)){
                    let startOfDay = utils.getStartOfDay(loginsTimes[i]);
                    let gap = prevConcurrentTime - startOfDay;
console.log('gap-dayMillis', gap, DAY_MILLISECONDS)
                    if(gap == DAY_MILLISECONDS){
                        concurrentTimes++;
                        prevConcurrentTime = startOfDay;
                    }
                    else if(gap > DAY_MILLISECONDS){console.log('gap too large', gap)
                        if(gap > DAY_MILLISECONDS){
                            console.warn(`GAP should be dividable by day(${DAY_MILLISECONDS}ms), but actually ${gap}ms`);
                        }
                        break;
                    }
                }
            }
            //TODO: Review, should be restricted in query
            if(concurrentTimes > 7){
                concurrentTimes = 7;
            }
            let dailyBonusVolume = concurrentTimes * 5;
console.log('concurrentTimes', concurrentTimes);
console.log('dailyBonusVolume', dailyBonusVolume);
            user.amountCrystal += dailyBonusVolume;
            user.gotDailyBonusAt = currentTime;
            await user.save();
            res.status(200).send('OK');
        }
        else {
            res.status(400).send('User already got daily bonus');
        }
    })
    .delete('/self', async (req, res) => {
        let user = await User.findOne({
            where: {
                snsName: req.snsName,
                snsId: req.snsId
            }
        });
        if (user) {
            await user.destroy();
        }
        res.status(200).send('OK');
    })

module.exports = router;
