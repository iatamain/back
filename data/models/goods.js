const sequelize = require('sequelize');
const connection = require('../index').getConnection();

const Goods = connection.define('goods', {
    id: {
        type: sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    name: sequelize.STRING,
    imgUrl: sequelize.STRING,
    price: sequelize.INTEGER,
    impact: {},
    impactSkin: {}
}, {
        timestamps: false,
    });

Goods.sync();

module.exports = Goods;