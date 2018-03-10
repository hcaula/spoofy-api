/*
 * Modules
*/
const express = require('express');
const app = express();
const async = require('async');

const authFlow = require('../lib/feeder').authFlow;

module.exports = function(app) {

    app.get('/callback', function(req, res){
        authFlow(req.query, function(error){
            if(error) {
                if(error.status) res.status(error.status);
                else res.status(400);
                res.json(error);
            }
            else res.status(200);
        });        
    });
}