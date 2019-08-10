const md5 = require('crypto');

const utils = {
    checkAuthKeyVK(authKey, viewerId, vkAppId, vkAppSecret) {
        const authKeyCheck = md5.createHash('md5')
            .update(`${vkAppId}_${viewerId}_${vkAppSecret}`)
            .digest()
            .toString('hex');
        return authKey == authKeyCheck;
    },

    getStartOfDay(time){
        if(time == null){
            time = new Date();
        }
        else if(!(time instanceof Date)){
            time = new Date(time); 
        }
        return time.setHours(0, 0, 0, 0);
    }
};

module.exports = utils;