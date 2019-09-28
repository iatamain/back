const sequelize = require('sequelize');
const connection = require('../index').getConnection();

const Map = connection.define('maps', {
    id: {
        type: sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    name: sequelize.STRING,
    logoUrl: sequelize.STRING,
    data: sequelize.JSON
}, {
        timestamps: false,
    });

Map.sync();

module.exports = Map;