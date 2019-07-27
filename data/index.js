/**
 * @author cybor97
 */
const Sequelize = require('sequelize');
const config = require('../config');

class DBConnection {
    static getConnection() {
        if (!this.connection) {
            this.connection = new Sequelize({
                dialect: 'mysql',
                host: config.db.host,
                database: config.db.database,
                username: config.db.username,
                password: config.db.password,
                logging: (process.argv.indexOf('-v') != -1) ? console.log : null
            });
        }

        return this.connection;
    }
}

module.exports = DBConnection;