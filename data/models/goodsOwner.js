const sequelize = require('sequelize');
const connection = require('../index').getConnection();
const User = require('./user');
const Goods = require('./goods');

const GoodsOwner = connection.define('goodsOwner', {
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
    goodsIdId: {
        type: sequelize.INTEGER,
        references: {
            model: Goods,
            key: 'id'
        }
    },
}, {
        timestamps: false,
    });
GoodsOwner.sync();

GoodsOwner.belongsTo(Goods, { onDelete: 'cascade', onUpdate: 'cascade' })
GoodsOwner.belongsTo(User, { onDelete: 'cascade', onUpdate: 'cascade' })


module.exports = GoodsOwner;