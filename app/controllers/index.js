/*
 * Modules
*/
const express = require('express');
const app = express();

module.exports = function(app) {

    app.get('/', function(res, req){
        console.log("Hello!");
        res.status(200).send("Hello world!");
    });

}