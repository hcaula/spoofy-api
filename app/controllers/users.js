/*
 * Modules
*/
const express = require('express');
const app = express();
const async = require('async');
const config = require('../../config/config');
const base64 = require('base-64');
const winston = require('winston');

const request = require('../lib/requests').request;
const initJob = require('../lib/jobs').initJob;

const User = require('mongoose').model('User');

module.exports = function(app) {
    app.get('/callback', requestAccessToken, requestUserData, loginOrRegister);
    app.post('/user/recent', updateUserRecentlyPlayedTracks);
}

let requestAccessToken = function(req, res, next) {
    if(req.query.error) {
        res.status(401).json({
            success: false,
            message: 'Authentication error.',
            error: req.query.error
        });
    } else {
        let code = req.query.code;
        let client_id = (process.env.SPOTIFY_CLIENTID || config.spotify.client_id);
        let client_secret = (process.env.SPOTIFY_CLIENTSECRET|| config.spotify.client_secret);
        let encoded = base64.encode(`${client_id}:${client_secret}`);
        let redirect_uri = (process.env.SPOTIFY_REDIRECTURI || config.spotify.redirect_uri);

        let body = {
            'grant_type':'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri
        }

        let options = {
            host: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: {'Authorization': `Basic ${encoded}`}
        }

        request('https', options, body, function(error, response){
            if(error) {
                res.status(500).json({
                    success: false,
                    message: 'Request error',
                    error: error
                });
            }
            else {
                req.token = response;
                next();
            }
        });
    }
}

let requestUserData = function(req, res, next) {
    let access_token = req.token.access_token;
    let options = {
        host: 'api.spotify.com',
        path: '/v1/me',
        method: 'GET',
        headers: {'Authorization': `Bearer ${access_token}`}
    }

    request('https', options, function(error, response){
        if(error) {
            winston.error(error);
            res.status(500).json({
                success: false,
                message: 'It was not possible to retrieve user information from Spotify',
                error: error
            });
        } else {
            req.user = {
                _id: response.id,
                display_name: (response.display_name || response.id),
                email: response.email,
                uri: response.uri,
                href: response.href,
                images: response.images,
                token: req.token
            }
            next();
        }
    });
}

let loginOrRegister = function(req, res, next) {
    User.findById(req.user._id, function(error, user){
        if(error) {
            res.status(500).json({
                success: false,
                message: "DB error on query for current user.",
                error: error
            });
        } else if (user) {
            res.status(200).json({
                success: true,
                message: "User has already been registered, redirect to dashboard page now."
            });
        } else {
            user = new User(req.user);
            user.save(function(error){
                if(error) {
                    res.status(500).json({
                        success: false,
                        message: "It was not possible to save the user on our database. We're sorry for that.",
                        error: error
                    });
                } else {
                    winston.info(`A new user has been registered.\nDisplay name: ${user.display_name}\n_id: ${user._id}`);
                    res.status(200).json({
                        success: true,
                        message: "User has been created successfully, redirect to dashboard page now."
                    });
                }
            });
        }
    });
}

let updateUserRecentlyPlayedTracks = function(req, res, next) {
    let user_id = req.body.user_id;
    if(!user_id || user_id == '') {
        res.status(400).json({
            success: false,
            error: {
                type: "missing_fields",
                message: "Field 'user_id' was not found on your request body."
            }
        });
    } else {
        User.findById(user_id, function(error, user){
            if(error) {
                res.status(500).json({
                    success: false,
                    error: {
                        type: 'internal_server_error',
                        message: "We messed up. We're very sorry. Try again in a while, please."
                    }
                });
            } else if(!user) {
                res.status(404).json({
                    success: false,
                    error: {
                        type: 'user_not_found',
                        message: "We looked very hard, but we couldn't find this user on our database."
                    }
                });
            } else {
                let users = [user];
                initJob(users, function(error){
                    if(error) {
                        res.status(500).json({
                            success: false,
                            error: {
                                type: 'internal_server_error',
                                message: "We messed up. We're very sorry. Try again in a while, please."
                            }
                        });
                    } else {
                        res.status(200).json({
                            success: true,
                            message: "User's recently played tracks have been updated successfully."
                        });
                    }
                });
            }
        });        
    }
}