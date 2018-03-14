/*
 * Modules
*/

const authenticateUser = require('../lib/auth').authenticateUser;

const User = require('mongoose').model('User');

module.exports = function(app) {
    app.get('/user', authenticateUser, getUser);
}



let getUser = function(req, res) {

}