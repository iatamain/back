const sequelize = require('sequelize');
const connection = require('../index').getConnection();

const User = connection.define('user', {
    id: {
        type: sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    snsId: sequelize.INTEGER,
    snsName: sequelize.STRING,
    nickname: sequelize.STRING,
    age: sequelize.INTEGER,
    avatarUrl: sequelize.STRING,
    sex: sequelize.STRING,
    country: sequelize.STRING,
    element: sequelize.STRING,
    rank: {
        type: sequelize.INTEGER,
        defaultValue: 0
    },
    rankingPos: {
        type: sequelize.INTEGER,
        defaultValue: 0
    },
    //TODO: Recalculate
    lvl: {
        type: sequelize.INTEGER,
        defaultValue: 1
    },
    experience: {
        type: sequelize.INTEGER,
        defaultValue: 0
    },
    amountCrystal: {
        type: sequelize.INTEGER,
        defaultValue: 0
    },
    progress: sequelize.JSON,
    achivements: sequelize.JSON,
    statistics: {
        type: sequelize.JSON,
        defaultValue: { gamesTotal: 0, gamesWon: 0 }
    }
}, {
        timestamps: false,
    });
User.sync();

module.exports = User;