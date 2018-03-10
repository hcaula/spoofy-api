/*
 * Modules
*/
const express = require('express');
const app = express();

module.exports = function(app) {

    app.get('/', function(req, res){
        console.log("Hello!");
        res.status(200).send("Hello world!");
    });

    app.get('/index', function(req, res){
        res.status(200).send("Index page");
    });

}