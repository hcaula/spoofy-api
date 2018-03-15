const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');

const filter_phase = require('../lib/filter_phase');
const auth_phase = require('../lib/auth');
const errors = require('../lib/errors');

module.exports = function(app) {
    app.get('/v1/stats/genre', auth_phase, filter_phase, getTracks);
}

let getTracks = function(req, res) {
    res.status(200).json({divisions: req.tracks});
}

let getGenres = function(req, res) {
    
}

