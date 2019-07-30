const sequelize = require('sequelize');
const connection = require('../index').getConnection();

const User = connection.define('user', {
    id: {
        type: sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    clanId: {
        type: sequelize.INTEGER
    },
    snsId: sequelize.INTEGER,
    snsName: sequelize.STRING,
    nickname: sequelize.STRING,
    age: sequelize.INTEGER,
    avatarUrl: sequelize.STRING,
    sex: sequelize.STRING,
    country: sequelize.STRING,
    element: sequelize.STRING,
    rank: sequelize.INTEGER,
    rankingPos: sequelize.INTEGER,
    //TODO: Recalculate
    lvl: sequelize.INTEGER,
    experience: sequelize.INTEGER,
    amountCrystal: sequelize.INTEGER,
    progress: sequelize.JSON,
    achivements: sequelize.JSON,
    statistics: sequelize.JSON
}, {
        timestamps: false,
    });
User.sync();

module.exports = User;