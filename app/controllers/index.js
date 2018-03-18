const express = require('express');
const app = express();
const winston = require('winston');

const Session = require('mongoose').model('Session');

const auth_phase = require('../lib/auth_phase');
const errors = require('../lib/errors');

module.exports = function(app) {

    app.get('/', auth_phase, function(req, res){
        /* After the auth_phase, if the user has a cookie registered,
        he/she will be returned in req.user, so we can log him directly.
        Otherwise, render home page normally. */
        if(req.user) res.redirect('/dashboard');
        else res.status(200).send("Home page");
    });

    app.get('/dashboard', auth_phase, function(req, res){
        if(!req.user) res.redirect('/');
        else res.status(200).json({
            message: "User logged in successfully.",
            user: req.user.display_name
        });
    });

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