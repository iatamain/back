const md5 = require('crypto');

const utils = {
    checkAuthKeyVK(authKey, viewerId, vkAppId, vkAppSecret) {
        const authKeyCheck = md5.createHash('md5')
            .update(`${vkAppId}_${viewerId}_${vkAppSecret}`)
            .digest()
            .toString('hex');
        return authKey == authKeyCheck;
    }
};

module.exports = utils;