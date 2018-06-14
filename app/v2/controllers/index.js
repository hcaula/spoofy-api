const winston = require('winston');

const Session = require('mongoose').model('Session');

const auth = require('../lib/auth');
const errors = require('../lib/errors');

module.exports = function (app) {
    app.get('/login', auth, login);
    app.get('/logout', auth, logout);
}

const login = function (req, res) {
    if (req.user) res.status(200).json({ user: req.user });
    else res.status(200).json({ user: false });
}

const logout = function (req, res) {
    if (req.user) {
        Session.remove({ user: req.user._id }, error => {
            if (error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else {
                res.status(200).json({ "message": "User logged out successfully." });
            }
        });
    } else {
        res.status(200).json({
            "error": "No user was found.",
            "type": "user_not_found"
        });
    }
}