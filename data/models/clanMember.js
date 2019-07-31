const sequelize = require('sequelize');
const connection = require('../index').getConnection();
const User = require('./user');
const Clan = require('./clan');

const ClanMember = connection.define('login', {
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
    clanId: {
        type: sequelize.INTEGER,
        references: {
            model: Clan,
            key: 'id'
        }
    },
    role: {
        type: sequelize.INTEGER,
        defaultValue: 0
    },
    state: {
        type: sequelize.INTEGER,
        defaultValue: 0
    }
}, {
        timestamps: false,
    });
ClanMember.sync();

ClanMember.belongsTo(Clan, { onDelete: 'cascade', onUpdate: 'cascade' })
ClanMember.belongsTo(User, { onDelete: 'cascade', onUpdate: 'cascade' })


module.exports = ClanMember;