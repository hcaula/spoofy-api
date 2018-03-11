/*
 * Configuration module
*/

let config = require('./environments/' + process.env.NODE_ENV + '.json')
config.env = process.env.NODE_ENV;
module.exports = config;