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

// exports.getPeriodArrays = function(begin_hour, end_hour, begin_day, end_day, callback) {
//     if(!req.query.begin_hour && !req.query.end_hour) end_hour = 24;
//     else if (req.query.begin_hour && !req.query.end_hour) end_hour = begin_hour;
//     else if (req.query.begin_hour && req.query.end_hour) end_hour = parseInt(req.query.end_hour)
//     else {
//         res.status(400).json({
//             type: 'bad_request',
//             error: "An end hour should come with a begin hour."
//         });
//     }

//     let begin_day = (parseInt(req.query.begin_day) || 0);

//     let end_day;
//     if(!req.query.begin_day && !req.query.end_day) end_day = 7;
//     else if (req.query.begin_day && !req.query.end_day) end_day = begin_day;
//     else if (req.query.begin_day && req.query.end_day) end_day = parseInt(req.query.end_day)
//     else {
//         res.status(400).json({
//             type: 'bad_request',
//             error: "An end day day should come with a begin day."
//         });
//     }
// }