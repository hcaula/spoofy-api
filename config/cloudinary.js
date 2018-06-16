const winston = require('winston');
const cloudinary = require('cloudinary');

exports.configCloudinary = function (next) {
    
    cloudinary.config({
        cloud_name: 'spoofy',
        api_key: process.env.CLOUDINARY_APIKEY,
        api_secret: process.env.CLOUDINARY_SECRET
    });
    
    winston.info("Cloudinary configured successfully.");
    next();
}