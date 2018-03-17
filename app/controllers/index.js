const express = require('express');
const app = express();

const auth_phase = require('../lib/auth_phase');

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
        else res.status(200).send("Dashboard page");
    });

}