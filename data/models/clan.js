const sequelize = require('sequelize');
const connection = require('../index').getConnection();

const Clan = connection.define('login', {
    id: {
        type: sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    name: sequelize.STRING,
    description: sequelize.STRING,
    imageUrl: sequelize.STRING,
    rating: {
        type: sequelize.INTEGER,
        defaultValue: 0
    },
    statistics: {
        type: sequelize.JSON,
        defaultValue: { gamesTotal: 0, gamesWon: 0 }
    }
}, {
        timestamps: false,
    });
Clan.sync();

module.exports = Clan;