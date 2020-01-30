/**
 * @author cybor97
 */
const path = require('path');
const fs = require('fs');

const configFilename = path.join(__dirname, './config.json');

if (!fs.existsSync(configFilename)) {
    console.error("File config.json doesn't exist!")
    process.kill(process.pid);
}

module.exports = Object.assign({
    vkOauthUrl: 'https://oauth.vk.com/access_token',
    vkApiUrl: 'https://api.vk.com/method',
    vkApiVersion: '5.62',
    defaultRoomVolume: 8,
    enableClientLog: true
},
    JSON.parse(fs.readFileSync(configFilename))
);
