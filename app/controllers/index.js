const express = require('express');
const app = express();
const winston = require('winston');

const Session = require('mongoose').model('Session');

const auth_phase = require('../lib/auth_phase');
const errors = require('../lib/errors');

module.exports = function (app) {

    app.get('/login', auth_phase, (req, res) => {
        if (req.user) res.status(200).json({ user: req.user });
        else res.status(200).json({ user: false });
    });

    app.get('/logout', auth_phase, (req, res) => {
        if (req.user) {
            Session.remove({ user: req.user._id }, error => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    res.status(200).json({
                        "message": "User logged out successfully."
                    });
                }
            });
        } else {
            res.status(200).json({
                "message": "No user was found."
            });
        }
    });
}