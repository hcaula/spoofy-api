const auth_phase = require('../lib/auth_phase');

const User = require('mongoose').model('User');

module.exports = function (app) {
    app.get('/api/v1/me', auth_phase, getUser);
}

const getUser = function (req, res) {
    const user = req.user;
    res.status(200).json({
        _id: user._id,
        display_name: user.display_name,
        email: user.email,
        uri: user.uri,
        href: user.href,
        images: user.images
    });
}