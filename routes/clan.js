const router = require('express').Router();
const sequelize = require('sequelize');

const User = require('../data/models/user');
const Clan = require('../data/models/clan');
const ClanMember = require('../data/models/clanMember');

router
    .get('/', (req, res) => {

    })
    .get('/:clanId', (req, res) => {

    })
    .post('/', (req, res) => {

    })
    .put('/:clanId', (req, res) => {

    })
    .delete('/:clanId', (req, res) => {

    });

module.exports = router;