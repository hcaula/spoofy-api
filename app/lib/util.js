/*
 * Exportable functions
*/

exports.takePairs = function (array) {
    let pairs = [];
    array.forEach(i => {
        array.forEach(j => {
            if(i != j) {
                let found = false;
                pairs.forEach(p => {
                    if((p[0] == i && p[1] == j) || (p[1] == i && p[0] == j)) {
                        found = true;
                        return;
                    }
                });

                if(!found) pairs.push([i, j]);
            } else return;
        });
    });

    return pairs;
}

exports.calculateExpirationDate = function (expires_in) {
    const now = Date.now();
    return new Date(now + (expires_in * 1000));
}

exports.calculateNextWeek = function () {
    const today = new Date();
    const nextweek = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 7,
        today.getHours(),
        today.getMinutes(),
        today.getSeconds(),
        today.getMilliseconds()
    );
    return nextweek;
}

exports.searchByField = function (value, field, array) {
    let index = -1;
    array.forEach((el, i) => {
        if (el[field] == value) {
            index = i;
            return;
        }
    });
    return index;
}

exports.countElement = function (elem, array) {
    return array.filter(x => (x == elem)).length;
}

exports.organizeMeta = function(tracks, meta, search, field) {
    let metas = [], counted_metas = [], ret_metas = [];

    tracks.forEach(track => {
        track[meta].forEach(m => {
            if(search) metas.push(m[search]);
            else metas.push(m);
        });
    });

    metas.forEach(m => {
        let included = counted_metas.includes(m);
        if (!included) {
            counted_metas.push(m);
            let obj = {};
            obj[(field || meta)] = m;
            obj.times_listened = exports.countElement(m, metas);
            ret_metas.push(obj);
        }
    });

    const sorted = ret_metas.sort((a, b) => b.times_listened - a.times_listened)

    return sorted;
}

exports.normalize = function (array) {
    const { max, min } = getMinAndMax(array);
    const diff = max - min;

    let normalized = [];
    array.forEach((el, i) => normalized[i] = ((el - min) / diff));

    return normalized;
}

/*
 * Auxiliar functions
*/

const getMinAndMax = function (array) {
    let max = -Infinity, min = Infinity;
    array.forEach(el => {
        if (el > max) max = el;
        if (el < min) min = el;
    });

    return { max: max, min: min }
}