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