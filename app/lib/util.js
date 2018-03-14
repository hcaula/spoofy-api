exports.calculateExpirationDate = function(expires_in){
    let now = Date.now();
    return new Date(now + (expires_in*1000));
}

exports.searchByField = function(field, value, array) {
    let index = -1;
    array.forEach(function(el, i){
        if(el[field] == value) {
            index = i;
            return;
        }
    });
    return index;
}

exports.filterPerPeriod = function(periods, field, array) {

    let begin_hour_str = periods.begin_hour;
    let begin_day_str = periods.begin_day;
    let end_hour = periods.end_hour;
    let end_day = periods.end_day;

    
    let begin_hour = (parseInt(begin_hour_str) || 0);
    if(!begin_hour_str && !end_hour) end_hour = 23;
    else if (begin_hour_str && !end_hour) end_hour = begin_hour;
    else if (begin_hour_str && end_hour) end_hour = parseInt(end_hour)
    else {
        let error = {
            type: 'bad_request',
            error: "An end hour should come with a begin hour."
        }
        return {error: error}
    }

    
    let begin_day = (parseInt(begin_day_str) || 0);
    if(!begin_day_str && !end_day) end_day = 6;
    else if (begin_day_str && !end_day) end_day = begin_day;
    else if (begin_day_str && end_day) end_day = parseInt(end_day)
    else {
        let error = {
            type: 'bad_request',
            error: "An end day day should come with a begin day."
        }
        return {error: error}
    }
    
    if(begin_hour < 0 || begin_hour > 23 || end_hour < 0 || end_hour > 23) {
        let error = {
            type: 'bad_request',
            error: 'Invalid hour.'
        };
        return {error: error}
    } else if (begin_hour > end_hour) {
        let error = {
            type: 'bad_request',
            error: 'The end hour should be bigger than the begin hour.'
        };
        return {error: error}
    } else if(begin_day < 0 || begin_day > 6 || end_day < 0 || end_day > 6) {
        let error = {
            type: 'bad_request',
            error: 'Invalid day.'
        };
        return {error: error}
    } else if (begin_day > end_day) {
        let error = {
            type: 'bad_request',
            error: 'The end day should be bigger than the begin day.'
        };
        return {error: error}
    } 

    let hours = [];
        if(end_hour == begin_hour) hours = [begin_hour];
        else for(let i = begin_hour; i <= end_hour; i++) hours.push(i);

    let days = [];
    if(end_day == begin_day) days = [begin_day];
    else for(let i = begin_day; i <= end_day; i++) days.push(i);

    let ret = [];
    array.forEach(function(el){
        for(let i = 0; i < el[field].length; i++) {
            let date = el[field][i];
            if(hours.includes(date.getUTCHours()) && days.includes(date.getUTCDay())) {
                ret.push(el);
                i = el[field].length;
            }
        }
    });

    return {array: ret}

}

exports.dividePerTime = function(frequency, choice, field, array) {
    let iterations = (choice == 'day' ? 24 : 7);

    let arrayRet = [];
    for(let i = 0; i < iterations; i++) {
        let filter;
        if(choice == 'day') {
            filter = {
                begin_day: frequency,
                begin_hour: i.toString()
            }
        } else {
            filter = {
                begin_day: i.toString(),
                begin_hour: frequency
            }
        }

        ret = exports.filterPerPeriod(filter, field, array);
        if(ret.error) return ret.error;
        else {
            let obj = {tracks: ret.array};
            obj[(choice == 'hour' ? 'day' : 'hour')] = i;
            arrayRet.push(obj);
        }
    } 

    return arrayRet;

}