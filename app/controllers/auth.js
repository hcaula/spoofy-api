/*
 * Modules
*/
const express = require('express');
const app = express();
const async = require('async');

const authFlow = require('../lib/feeder').authFlow;

module.exports = function(app) {

    app.get('/callback', function(req, res){
        console.log("Hello!");
        authFlow(res.query, function(){
            res.status(200).send('User has authorized app access.');
        });        
    });
}