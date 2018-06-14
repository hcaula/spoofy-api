const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');

const errors = require('../lib/errors');
const auth = require('../lib/auth');
const { searchByField } = require('../lib/util');


module.exports = function (app) {
    app.get('/api/v2/playlists/genres', auth, getUsers, sharedGenres);
}

const getUsers = function(req, res, next) {
    const users = (req.query.users ? req.query.users.split(',') : []);
    if (!users.length) res.status(400).json(errors[400]('users'));
    else {
        req.users = [];
        async.eachSeries(users, (id, next) => {
            User.findById(id, (error, user) => {
                if (error) next(error);
                else {
                    req.users.push(user);
                    next();
                }
            });
        }, error => {
            if (error) {
                winston.error(req.query.error);
                res.status(500).json(errors[500]);
            } else next();
        });
    }
}

const sharedGenres = function(req, res) {
    const users = req.users;
    const intensities = (req.query.intensities ? req.query.intensities.split(',') : [].fill.call({ length: users.length }, 1));
    
    const genres = [], artists = [], tracks = [];
    users.forEach((user, i) => {
        user.genres.forEach(g => {
            const index = searchByField(g.name, "name", genres);
            if (index > -1) genres[index].weight += g.weight * intensities[i];
            else {
                genres.push({
                    name: g.name,
                    weight: g.weight * intensities[i]
                });
            }
        });
    });

    genres.sort((a, b) => b.weight - a.weight);

    res.status(200).json({genres: genres});

}