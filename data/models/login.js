const sequelize = require('sequelize');
const connection = require('../index').getConnection();
const User = require('./user');

const Login = connection.define('login', {
    id: {
        type: sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: sequelize.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    },
    time: sequelize.BIGINT,
    ip: sequelize.STRING,
    userAgent: sequelize.STRING
}, {
        timestamps: false,
    });

Login.belongsTo(User, { onDelete: 'cascade', onUpdate: 'cascade' })

Login.sync();

module.exports = Login;