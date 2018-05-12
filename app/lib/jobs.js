const async = require('async');
const config = require('../../config/config');
const { encode } = require('base-64');
const winston = require('winston');

const { request } = require('./requests');

const User = require('mongoose').model('User');
const Play = require('mongoose').model('Play');
const Track = require('mongoose').model('Track');

let results;

/* Request new token using the refresh token */
const refreshToken = function (next) {
    const now = Date.now();

    /* We add a little limit so that the token doesn't expire mid-request */
    const limit = now + 60000;
    const today = new Date(limit);

    const user = results.user;

    if (today < user.token.expiration_date) {
        winston.info("Token hasn't expired yet, so it doesn't need to be refreshed.");

        results.token = user.token;
        next();
    } else {
        winston.info("Token has expired. Requesting new access_token from Spotify.");

        const refresh_token = user.token.refresh_token;
        const client_id = (process.env.SPOTIFY_CLIENTID || config.spotify.client_id);
        const client_secret = (process.env.SPOTIFY_CLIENTSECRET || config.spotify.client_secret);
        const encoded = encode(`${client_id}:${client_secret}`);

        const body = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        }

        const options = {
            host: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: { 'Authorization': `Basic ${encoded}` }
        }

        request('https', options, body, (error, response) => {
            if (error) {
                let err = new Error(error);
                winston.warn(err);

                /* If there's something wrong with the request, skip the user */
                err.stop = true;
                next(err);
            } else {
                winston.info("New access_token has been requested successfully.");

                results.token = response;
                next();
            }
        });
    }
}

/* Update token on our database */
const updateToken = function (next) {
    const user = results.user;
    const token = results.token;

    /* If both access tokens are equal, then the token 
    has not been refreshed and we can skip this function */
    if (user.token.access_token == token.access_token) next();
    else {
        winston.info("Updating user token on local DB.");

        let user = results.user, token = results.token;

        token.refresh_token = user.token.refresh_token;
        user.token = token;

        user.save((error, newUser) => {
            if (error) {
                let err = new Error(error);
                err.type = 'db_error';
                next(err);
            } else {
                winston.info("User token updated successfully.");

                results.user = newUser;
                next();
            }
        });
    }
}

/* Request recently played tracks */
const getRecentlyPlayedTracks = (next) => {
    winston.info("Requesting recently played tracks.");

    const token = results.token;

    const access_token = token.access_token;
    const type = "track";
    const limit = 50;

    const options = {
        host: 'api.spotify.com',
        path: `/v1/me/player/recently-played/?type=${type}&limit=${limit}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}` }
    }

    request('https', options, (error, response) => {
        if (error) {
            let err = new Error(error);
            err.message = 'Authentication error.';
            next(err);
        } else {
            winston.info("Recently played tracks requested successfully.");

            results.tracks = response.items;
            next();
        }
    });
}

/* Reduce the quantity of tracks by checking if they're already on our DB */
const shaveTracks = function (next) {
    winston.info("Shaving tracks.");
    const tracks = results.tracks;
    const user = results.user;

    const trackIds = tracks.map(t => t.track.id);
    const played_ats = (tracks.map(t => new Date(t.played_at)));
    const userId = user._id;

    const query = { user: userId, track: { $in: trackIds }, "played_at.fullDate": { $in: played_ats } };

    Play.find(query, function (error, play) {
        if (error) {
            let err = new Error(error);
            err.type = "db_error";
            next(err);
        } else {
            let diff = tracks.length - play.length;

            if (diff == 0) {
                winston.warn("User has not listened to any new tracks.");
                next({ stop: true });
            } else {
                const playIds = play.map(s => s.track);
                const shavedTracks = tracks.filter(t => !playIds.includes(t.track.id));

                /* We have to check again in case the user has listened to the same song
                more than once on his/her last recently played tracks */
                if (shavedTracks.length == 0) {
                    winston.warn("User has not listened to any new tracks.");
                    next({ stop: true });
                } else {
                    diff = shavedTracks.length;
                    winston.info(`${diff} new listened track${(diff > 1 ? 's' : '')} found.`);

                    results.tracks = shavedTracks;
                    next();
                }
            }
        }
    });
}

/* Request tracks features */
const getTracksFeatures = function (next) {
    winston.info("Requesting several tracks features.");

    const tracks = results.tracks;
    const user = results.user;

    let ids = '';
    ids += tracks.map((track, i) => `${track.track.id}${(i < (this.length - 1) ? ',' : '')}`);

    const options = {
        host: 'api.spotify.com',
        path: `/v1/audio-features/?ids=${ids}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${user.token.access_token}` }
    }

    request('https', options, (error, response) => {
        if (error) {
            let err = new Error(error);
            err.message = error.message;
            next(err);
        } else {
            winston.info("Several tracks features requested successfully.");

            results.features = response.audio_features;
            next();
        }
    });
}

/* Request artists */
const getArtists = function (next) {
    winston.info("Requesting several artists for genres retrieval.");

    const tracks = results.tracks;
    const user = results.user;
    const features = results.features;

    let ids = '';
    ids += tracks.map((track, i) => `${track.track.artists[0].id}${(i < (this.length - 1) ? ',' : '')}`);

    const options = {
        host: 'api.spotify.com',
        path: `/v1/artists/?ids=${ids}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${user.token.access_token}` }
    }

    request('https', options, (error, response) => {
        if (error) {
            let err = new Error(error);
            err.message = error.message;
            next(err);
        } else {
            winston.info("Several artists requested successfully.");

            results.artists = response.artists;
            next();
        }
    });
}

/* Create an array of saveable tracks - matching with our model */
const gatherTracksInfo = function (next) {
    winston.info("Gathering tracks information.");

    const tracks = results.tracks;
    const artists = results.artists;
    const features = results.features;

    let saveableTracks = [];
    tracks.forEach((track, i) => {
        const tr = track.track;
        const ft = features[i];
        const ar = artists[i];

        const saveableTrack = {
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
            features: {
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
            },
            genres: ar.genres,
            artists: [],

            played_at: track.played_at
        };

        tr.artists.forEach(artist => {
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

/* Save tracks on our DB */
const saveTracks = function (next) {
    winston.info("Saving tracks on local DB");

    const tracks = results.tracks;
    let newTracks = [];

    async.eachSeries(tracks, (track, next) => {
        const newTrack = new Track(track);
        newTrack.save(error => {
            if (error) {
                if (error.code == 11000) next();
                else {
                    let err = new Error(error);
                    err.type = "db_error";
                    next(err);
                }
            } else {
                newTracks.push(newTrack);
                next();
            }
        });
    }, error => {
        if (error) next(error);
        else {
            winston.info("Tracks saved successfully.");
            results.newTracks = newTracks;
            next();
        }
    });
}

/* Create plays on our DB */
const createPlays = function (next) {
    winston.info("Creating/updating new plays.");

    const user = results.user;
    const tracks = results.tracks;

    async.eachSeries(tracks, (track, next) => {
        const date = new Date(track.played_at);
        const play = new Play({
            user: user._id,
            track: track._id,
            played_at: {
                fullDate: date,
                year: date.getFullYear(),
                day: date.getDay(),
                hour: date.getHours(),
                minutes: date.getMinutes()
            }
        });

        play.save(error => {
            if (error) {
                let err = new Error(error);
                err.type = "db_error";
                next(err);
            } else next();
        });

    }, error => {
        if (error) next(error);
        else {
            winston.info("New play created successfully.")
            next();
        }
    });
}


exports.initJob = function (users, next) {
    results = {};

    async.eachSeries(users, (user, next) => {
        winston.info(`Getting recently played tracks for user ${user.display_name}.`);

        results.user = user;

        async.series([
            refreshToken,
            updateToken,
            getRecentlyPlayedTracks,
            shaveTracks,
            getTracksFeatures,
            getArtists,
            gatherTracksInfo,
            saveTracks,
            createPlays
        ], error => {
            if (error && !error.stop) next(error);
            else if (error && error.stop) {
                winston.info(`Stoping init job for user ${results.user.display_name}.`);
                next();
            } else {
                winston.info(`Recently played tracks for user ${user.display_name} have been updated successfully.`);
                next();
            }
        });
    }, error => {
        if (error) {
            winston.error(error.stack);
            next(error);
        } else {
            winston.info('Recent tracks for all users have been updated successfully.');
            next();
        }
    });
}