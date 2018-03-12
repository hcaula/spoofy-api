#!/usr/bin/env node

let start = Date.now();

const winston = require('winston');

require('../app/models/user')();
require('../app/models/user-track')();
require('../app/models/track')();
require('../app/models/genre')();

const configWinston = require('../config/winston').configWinston;
const initMongoose = require('../config/database').initMongoose;
const initJob = require('../app/lib/jobs').initJob;

const User = require('mongoose').model('User');

configWinston(function(){
    winston.info("Starting scheduled job.");

    initMongoose(function(error){
        if(error) winston.log(error);
        else {
            User.find({role: "user"}, function(error, users){
                if(error) winston.log(error);
                else {
                    initJob(users, function(error){
                        if(error) winston.log(error);
                        else {
                            let elapsed = (Date.now() - start)/1000;
                            winston.info(`Scheduler job executed successfully in approximately ${elapsed} seconds.`);
                        }
                    });
                }
            });
        }
    });
});
