/*
 * Modules
*/

const authenticateUser = require('../lib/auth').authenticateUser;

const User = require('mongoose').model('User');

module.exports = function(app) {
    app.get('/user', authenticateUser, getUser);
}



let getUser = function(req, res) {
    let user = req.user;
    res.status(200).json({
        _id: user._id,
        display_name: user.display_name,
        email: user.email,
        uri: user.uri,
        href: user.href,
        images: user.images
    });
}