const async = require('async');
const config = require('../../config/config');
const base64 = require('base-64');
const winston = require('winston');

const request = require('./requests').request;

const User = require('mongoose').model('User');
const User_Track = require('mongoose').model('User_Track');
const Track = require('mongoose').model('Track');

let results;

const refreshToken = function(next) {
    let now = Date.now();

    /* We add a little limit so that the token doesn't expire mid-request */
    let limit = now + 60000;
    let today = new Date(limit);

    let user = results.user;

    if(today < user.token.expiration_date) {
        winston.info("Token hasn't expired yet, so it doesn't need to be refreshed.");

        results.token = user.token;
        next();
    } else {
        winston.info("Token has expired. Requesting new access_token from Spotify.");

        let refresh_token = user.token.refresh_token;
        let client_id = (process.env.SPOTIFY_CLIENTID || config.spotify.client_id);
        let client_secret = (process.env.SPOTIFY_CLIENTSECRET|| config.spotify.client_secret);
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
            if(error) {
                let err = new Error(error.message);
                err.message = 'Authentication error.';
                next(err);
            } else {
                winston.info("New access_token has been requested successfully.");
                
                results.token = response;
                next();
            }
        });
    }
}

const updateToken = function(next) {
    let user = results.user;
    let token = results.token;

    /* If both access tokens are equal, then the token 
    has not been refreshed and we can skip this function */
    if(user.token.access_token == token.access_token) next();
    else {
        winston.info("Updating user token on local DB.");

        let user = results.user, token = results.token;

        token.refresh_token = user.token.refresh_token;
        user.token = token;

        user.save(function(error, newUser){
            if(error) {
                let err = new Error(error.message);
                next(err);
            } else {
                winston.info("User token updated successfully.");

                results.user = newUser;
                next();
            }
        });
    }
}

const getRecentlyPlayedTracks = function(next) {
    winston.info("Requesting recently played tracks.");
    
    let token = results.token;

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
        if(error) {
            let err = new Error(error.message);
            err.message = 'Authentication error.';
            next(err);
        } else {
            winston.info("Recently played tracks requested successfully.");

            results.tracks = response.items;
            next();
        }
    });
}

const getTracksFeatures = function(next) {
    winston.info("Requesting several tracks features.");

    let tracks = results.tracks;
    let user = results.user;

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
        if(error) {
            let err = new Error(error.message);
            err.message = 'Authentication error.';
            next(err);
        } else {
            winston.info("Several tracks features requested successfully");

            results.features = response.audio_features;
            next();
        }
    });
}

const getArtists = function(next) {
    winston.info("Requesting several artists for genres retrieval.");

    let tracks = results.tracks;
    let user = results.user;
    let features = results.features;

    let ids = '';
    tracks.forEach(function(track, i){
        ids += track.track.artists[0].id;
        if(i < tracks.length - 1) ids += ',';
    });

    let options = {
        host: 'api.spotify.com',
        path: `/v1/artists/?ids=${ids}`,
        method: 'GET',
        headers: {'Authorization': `Bearer ${user.token.access_token}`}
    }

    request('https', options, function(error, response){
        if(error) {
            let err = new Error(error.message);
            err.message = 'Authentication error.';
            next(err);
        } else {
            winston.info("Several artists requested successfully.");

            results.artists = response.artists;
            next();
        }
    });
}

const gatherTracksInfo = function(next) {
    winston.info("Gathering tracks information.");

    let tracks = results.tracks;
    let artists = results.artists;
    let features = results.features;

    let saveableTracks = [];
    tracks.forEach(function(track, i){
        let tr = track.track;
        let ft = features[i];
        let ar = artists[i];

        let saveableTrack = {
            _id: tr.id,
            name: tr.name,
            duration_ms: tr.duration_ms,
            explicit: tr.explicit,
            href: tr.href,

            album: {
                id: tr.album.id,
                name: tr.album.name,
                images: tr.album.images,
                href: tr.uri
            },

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
            
            genres: ar.genres,
            artists: [],

            played_at: track.played_at
        };

        tr.artists.forEach(function(artist){
            saveableTrack.artists.push({
                name: artist.name,
                href: artist.href,
                id: artist.id
            });
        });

        saveableTracks.push(saveableTrack);
    });

    winston.info("Tracks information gathered successfully")

    results.tracks = saveableTracks;
    next();
}

const saveTracks = function(next) {
    winston.info("Saving tracks on local DB");

    let tracks = results.tracks;

    async.eachSeries(tracks, function(track, next){
        let newTrack = new Track(track);
        newTrack.save(function(error){
            let trackStr = `${track.name} by ${track.artists[0].name}.`
            if(error) {
                if(error.code == 11000) next();
                else {
                    let err = new Error(error);
                    err.type = "db_validation";
                    next(err);
                }
            } else next();
        });
    }, function(error){
        if(error) next(error);
        else {
            winston.info("Tracks saved successfully.");
            next();
        }
    });
}

const createOrUpdateUserTracks = function(next) {
    winston.info("Creating/updating new user-track relationships.");

    let user = results.user;
    let tracks = results.tracks;

    async.eachSeries(tracks, function(track, next){
        User_Track.update(
            {user: user._id, track: track._id},
            {$addToSet: {played_at: track.played_at}},
            {upsert: true},
            function(error) {
                if(error) {
                    let err = new Error(error);
                    err.type = "db_validation";
                    next(err);
                } else next();
            }
        );
    }, function(error){
        if(error) next(error);
        else {
            winston.info("New user-track relationships created/updated successfully.")
            next();
        }
    });
}


exports.initJob = function(users, next) {
    let start = Date.now();

    results = {};

    async.eachSeries(users, function(user, next){
        winston.info(`Getting recently played tracks for user ${user.display_name}.`);

        results.user = user;

        async.series([
            refreshToken,
            updateToken,
            getRecentlyPlayedTracks,
            getTracksFeatures,
            getArtists,
            gatherTracksInfo,
            saveTracks,
            createOrUpdateUserTracks
        ], function(error){
            if(error) next(error);
            else {
                winston.info(`Recently played tracks for user ${user.display_name} have been updated successfully.`);
                next();
            }
        });
    }, function(error){
        if(error) {
            winston.error(error.stack);
            next(error);
        } else {
            let elapsed = (Date.now() - start)/1000;
            winston.info('Recent tracks for all users have been updated successfully.');
            winston.info(`Approximated total time for job: ${elapsed} seconds.`);
            next();
        }
    });
}