/*
 * Configuration module
*/

if(!process.env.NODE_ENV){
    let error = new Error('NODE_ENV is not defined.');
    throw error;
} else {
    let config = require('./environments/' + process.env.NODE_ENV + '.json')
    config.env = process.env.NODE_ENV;
    module.exports = config;
}