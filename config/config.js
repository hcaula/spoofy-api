/*
 * Configuration module
*/

const config = require('./environments/' + (process.env.NODE_ENV || "production") + '.json');
config.env = process.env.NODE_ENV;
module.exports = config;
