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
const calculateExpirationDate = require('../lib/util').calculateExpirationDate;

const User = require('mongoose').model('User');

module.exports = function(app) {
    app.get('/user', requestAccessToken, requestUserData, loginOrRegister, createUser);
}

let requestAccessToken = function(req, res, next) {
    if(req.query.error) {
        res.status(401).json({
            success: false,
            message: 'Authentication error.',
            error: req.query.error
        });
    }
    else {
        let code = req.query.code;
        let client_id = config.spotify.client_id;
        let client_secret = config.spotify.client_secret;
        let encoded = base64.encode(`${client_id}:${client_secret}`);

        let body = {
            'grant_type':'authorization_code',
            'code': code,
            'redirect_uri': 'http://localhost:3000/user'
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
            res.status(400).json({
                success: false,
                message: 'Not possible to retrieve user information from Spotify',
                error: error
            });
        } else {
            req.user = {
                _id: response.id,
                display_name: response.display_name,
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
        } else if (user) res.redirect('/index');
        else next();
    });
}

let createUser = function(req, res, next) {
    let user = new User(req.user);

    user.save(function(error){
        if(error) {
            res.status(500).json({
                success: false,
                message: "Not possible to save the user on the database.",
                error: error
            });
        } else {
            winston.info(`A new user has been registered.\nDisplay name: ${user.display_name}\n_id: ${user._id}`);
            res.redirect('/index');
        }
    });
} 