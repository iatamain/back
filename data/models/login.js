const sequelize = require('sequelize');
const connection = require('../index').getConnection();

const Login = connection.define('login', {
    id: {
        type: sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    userId: sequelize.INTEGER,
    time: sequelize.BIGINT,
    ip: sequelize.STRING,
    userAgent: sequelize.STRING
}, {
        timestamps: false,
    });
Login.sync();

module.exports = Login;