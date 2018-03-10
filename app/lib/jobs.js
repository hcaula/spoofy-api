const async = require('async');
const config = require('../../config/config');
const base64 = require('base-64');
const winston = require('winston');

const request = require('./requests').request;

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');

const refreshToken = function(user, next) {
    let now = Date.now();

    /* We add a little limit so that the token doesn't expire mid-request */
    let limit = now + 60000;
    let today = new Date(limit);

    if(today < user.token.expiration_date) {
        winston.info("Token hasn't expired yet, so it doesn't need to be refreshed. Continuing request...");
        next(null, user, user.token);
    } else {
        winston.info("Token has expired. Requesting new access_token from Spotify.");

        let refresh_token = user.token.refresh_token;
        let client_id = config.spotify.client_id;
        let client_secret = config.spotify.client_secret;
        let encoded = base64.encode(`${client_id}:${client_secret}`);

        let body = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        }

        let options = {
            host: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: {'Authorization': `Basic ${encoded}`}
        }

        request('https', options, body, function(error, response){
            if(error || response.error) next((error ? error : response));
            else {
                winston.info("New access_token has been requested successfully.");
                next(null, user, response);
            }
        });
    }
}

const updateToken = function(user, token, next) {
    if(user.token.access_token == token.access_token) next(null, user, token);
    else {
        winston.info("Updating user token on local DB.");
        token.refresh_token = user.token.refresh_token;
        user.token = token;

        user.save(function(error, newUser){
            if(error) next(error);
            else {
                winston.info("User token updated successfully.");
                next(null, newUser, token);
            }
        });
    }
}

const getRecentlyPlayedTracks = function(user, token, next) {
    winston.info("Requesting recently played tracks.");
    let access_token = token.access_token;
    let type = "track";
    let limit = 50;

    let options = {
        host: 'api.spotify.com',
        path: `/v1/me/player/recently-played/?type=${type}&limit=${limit}`,
        method: 'GET',
        headers: {'Authorization': `Bearer ${access_token}`}
    }

    request('https', options, function(error, response){
        if(error) next(error);
        else {
            winston.info("Recently played tracks requested successfully.");
            next(null, user, response.items);
        }
    });
}

const getTracksFeatures = function(user, tracks, next) {
    winston.info("Requesting several tracks features.");

    let ids = '';
    tracks.forEach(function(track, i){
        ids += track.track.id;
        if(i < tracks.length - 1) ids += ',';
    });

    let options = {
        host: 'api.spotify.com',
        path: `/v1/audio-features/?ids=${ids}`,
        method: 'GET',
        headers: {'Authorization': `Bearer ${user.token.access_token}`}
    }

    request('https', options, function(error, response){
        if(error || response.error) next((error ? error : response));
        else {
            winston.info("Several tracks features requested successfully");
            next(null, user, tracks, response.audio_features);
        }
    });
}

const gatherTracksInfo = function(user, tracks, features, next) {
    winston.info("Gathering tracks information.");

    let savableTracks = [];
    tracks.forEach(function(track, i){
        let tr = track.track;
        let ft = features[i];

        let savableTrack = {
            _id: tr.id,
            name: tr.name,
            duration_ms: tr.duration_ms,
            explicit: tr.explicit,
            href: tr.href,
            danceability: ft.danceability,
            energy: ft.energy,
            key: ft.key,
            loudness: ft.loudness,
            mode: ft.mode,
            speechiness: ft.speechiness,
            acousticness: ft.acousticness,
            instrumentalness: ft.instrumentalness,
            liveness: ft.liveness,
            valence: ft.valence,
            tempo: ft.tempo,
            time_signature: ft.time_signature,
            artists: []
        };

        tr.artists.forEach(function(artist){
            savableTrack.artists.push({
                name: artist.name,
                href: artist.href
            });
        });

        savableTracks.push(savableTrack);
    });

    winston.info("Tracks information gathered successfully")
    next(null, savableTracks);
}

const saveTracks = function(tracks, next) {
    winston.info("Saving tracks on local DB");

    async.eachSeries(tracks, function(track, next){
        let newTrack = new Track(track);
        newTrack.save(function(error){
            let trackStr = `${track.name} by ${track.artists[0].name}.`
            if(error) {
                if(error.code == 11000) {
                    winston.warn(`Track has already been saved: ${trackStr}.`);
                    next();
                } else next(error);
            } else {
                winston.info(`New track saved successfully: ${trackStr}.`)
                next();
            }
        });
    }, function(error){
        if(error) next(error);
        else {
            winston.info("Tracks saved successfully.");
            next();
        }
    });
}


exports.initJob = function(next) {
    winston.info("Initiating init job.");

    winston.info("Retrieving users from local DB.");
    User.find({role: {$ne: "admin"}}, function(error, users){
        if(error) next(error);
        else if (users.length < 0) {
            winston.warn("No users were found on local DB.");
            next();
        } else {
            winston.info("Users retrieved successfully.");

            async.eachSeries(users, function(user, next){

                winston.info(`Getting recently played tracks for user ${user.display_name}.`);

                /* First function is a dummy just to pass the user to the second function */
                async.waterfall([
                    function(next){next(null, user);},
                    refreshToken,
                    updateToken,
                    getRecentlyPlayedTracks,
                    getTracksFeatures,
                    gatherTracksInfo,
                    saveTracks
                ], function(error){
                    if(error) next(error);
                    else {
                        winston.info(`Recently played tracks for user ${user.display_name} have been updated successfully.`);
                        next();
                    }
                });

            }, function(error){
                if(error) {
                    winston.error(new Error(error));
                    next(error);
                }
                else next();
            });
        }
    });
}