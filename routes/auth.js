const router = require('express').Router();
const request = require('request');
const config = require('../config');

router.post('/vkauth', (req, res) => {
    if (req.body.code) {
        request.get(config.vkOauthUrl, {
            json: true,
            qs: {
                v: config.vkApiVersion,
                client_id: config.vkApp.id,
                client_secret: config.vkApp.secret,
                redirect_uri: req.body.redirect_uri,
                code: req.body.code
            }
        }, (err, resp) => {
            if (err) {
                res.status(500).send(err);
            }
            else {
                getUserInfo(resp.body.access_token, (err, result) => {
                    if (err) {
                        res.status(500).send(err);
                    }
                    else {
                        res.status(200).send(result);
                    }
                });

            }
        });
    }
    else if (req.body.access_token) {
        getUserInfo(req.body.access_token, (err, result) => {
            if (err) {
                res.status(500).send(err);
            }
            else {
                res.status(200).send(result);
            }
        });
    }
    else {
        res.status(400).send('code or access_token should be provided');
    }
})
//TODO: Implement
.post('/fbauth', (req, res) => {

})
//TODO: Implement
.post('/nauth', (req, res) =>{
    
});

function getUserInfo(access_token, callback) {
    request.get(`${config.vkApiUrl}/users.get`, {
        json: true,
        qs: {
            v: config.vkApiVersion,
            access_token: access_token
        }
    }, (err, resp) => {
        callback(err, resp.body);
    });

}

module.exports = router;