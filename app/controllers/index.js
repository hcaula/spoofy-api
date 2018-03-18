const express = require('express');
const app = express();
const winston = require('winston');

const Session = require('mongoose').model('Session');

const auth_phase = require('../lib/auth_phase');
const errors = require('../lib/errors');

module.exports = function(app) {

    app.get('/login', auth_phase, function(req, res){
        if(req.user) res.status(200).json({user: req.user});
        else res.status(200).json({user: false});
    });

    // TEST CHANGES

    app.get('/logout', auth_phase, function(req, res){
        if(req.user) {
            Session.remove({user: req.user._id}, function(error){
                if(error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    res.clearCookie("spoofy");
                    res.redirect('/');
                }
            });
        } else res.redirect('/');
    });
}