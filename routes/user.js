const router = require('express').Router();
const request = require('request');
const sequelize = require('sequelize');
const md5 = require('crypto');
const config = require('../config');

const User = require('../data/models/user');

//auth_key == md5(api_id + '_' + viewer_id + '_' + api_secret)
router
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
    .put('/update', async (req, res) => {
        let params = req.userId
            ? { id: req.userId }
            : { snsId: req.snsId, snsName: req.snsName };
        let user = await User.findOne({ where: params });
        params = Object.assign(req.body, params);
        if (user) {
            await user.update(params);
        }
        else {
            user = await User.create(params);
        }
        res.status(200).send(user);
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