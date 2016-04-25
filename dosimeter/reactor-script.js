var request = require('request');
var async = require('async');
var _ = require('lodash');

function notify(msg, callback) {
    request.post('https://hooks.slack.com/services/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', {json: {'text' : msg}},
        function(error, response, body){
            if(error) {
                logger.error(error);
                callback(error);
            } else {
                logger.debug('Slack ' + response.statusCode);
                callback();
            }
        }
    );
}

function updateProperty(thngId, key, value, callback) {
    EVT.api({
        url: '/thngs/' + thngId+ '/properties/' + key,
        method : 'put',
        data: [{
            value: value
        }],
        authorization : 'Jcp1ZhRc4Ee1p8SuYQOp9KecPqXHStVDq9vTXgWYmmlYOPTjyclg2eMvPSeSxRDVFpddPZdVavtsSuTS'
    }).then(function () {
        callback();
    }, function(err) {
        callback(err);
    });
}

function checkIfPlaceIsSensitive(event, callback) {
    var placeChange = event.changes['current_place']; // CST
    if (!placeChange) {
        callback();
        return;
    }

    var thng = event.thng;
    var alertMessage = thng.customFields['supervised_message']; // CST

    var newPlace = placeChange.newValue;
    logger.debug('Dosimeter enters a new place: '+newPlace);

    try {
        EVT.api({
            url: '/places/' + newPlace,
            authorization : 'Jcp1ZhRc4Ee1p8SuYQOp9KecPqXHStVDq9vTXgWYmmlYOPTjyclg2eMvPSeSxRDVFpddPZdVavtsSuTS'
        }).then(function (place) {
            logger.debug('Place loaded: ' + place.name);
            var supervised = place.customFields.supervised;
            if (supervised) {
                notify(alertMessage.replace('{}', place.name), callback);
            } else {
                callback();
            }
        }, function(err) {
            callback(err);
        })
    } catch (e) {
        callback(e);
    }

}

function checkTemperatureThreshold(event, callback) {
    var temperatureChange = event.changes['temperature']; // CST
    var thng = event.thng;

    var temperatureThreshold = thng.customFields['temperature_threshold']; // CST
    var alertMessage = thng.customFields['temperature_threshold_message']; // CST

    if (temperatureChange) {
        var newValue = temperatureChange.newValue;
        var oldValue = temperatureChange.oldValue;

        logger.debug('Temperature from '+oldValue+' to '+newValue);

        if (newValue >= temperatureThreshold && oldValue < temperatureThreshold) {
            // alert
            logger.debug('went above threshold');
            notify(alertMessage.replace('{}', newValue), callback);
        } else if (newValue < temperatureThreshold && oldValue >= temperatureThreshold) {
            // no need to worry
            logger.debug('back below threshold');
            notify('Temperature is back to '+newValue+' check your device for your daily exposure', callback);
        } else {
            callback();
        }
    } else {
        callback();
    }
}

function integrateTemperature(event, callback) {
    var tempTimestampChange = event.changes['temp_timestamp']; // CST
    var temperatureChange = event.changes['temperature']; // CST

    var thng = event.thng;

    if ( !tempTimestampChange) {
        callback();
        return;
    }

    EVT.api({
        url: '/thngs/' + thng.id+ '/properties',
        params: {
            perPage: '1'
        },
        authorization : 'Jcp1ZhRc4Ee1p8SuYQOp9KecPqXHStVDq9vTXgWYmmlYOPTjyclg2eMvPSeSxRDVFpddPZdVavtsSuTS'
    }).then(function (properties) {

        var tempProperty = _.find(properties, { key : 'temperature'});
        var integratedTempProperty = _.find(properties, { key : 'integrated_temp'});
        var integratedTempValue = (integratedTempProperty) ? integratedTempProperty.value : 0;

        var timeDifference = tempTimestampChange.newValue - tempTimestampChange.oldValue;
        var value = (temperatureChange) ? (temperatureChange.oldValue) : tempProperty.value;
        integratedTempValue += (value * timeDifference / 1000);

        logger.debug('timeDiff '+timeDifference+' value '+value+' sum '+integratedTempValue);

        updateProperty(thng.id, 'integrated_temp', integratedTempValue, callback);

    }, function(err) {
        callback(err);
    })
}

function checkIntegratedTemperatureThreshold(event, callback) {
    var integratedChange = event.changes['integrated_temp']; // CST
    var thng = event.thng;

    var integratedThreshold = thng.customFields['integrated_temp_threshold']; // CST
    var alertMessage = thng.customFields['integrated_temp_threshold_message']; // CST

    if (integratedChange) {
        var newValue = integratedChange.newValue;
        var oldValue = integratedChange.oldValue;

        logger.debug('integrated from '+oldValue+' to '+newValue);

        if (newValue >= integratedThreshold && oldValue < integratedThreshold) {
            // alert

            notify(alertMessage, callback);
        } else {
            // no need to worry
            callback();
        }
    } else {
        callback();
    }
}

function onThngPropertiesChanged(event) {

    async.series([
        function(cb) {
            integrateTemperature(event, cb);
        },
        function(cb) {
            checkIfPlaceIsSensitive(event, cb);
        },
        function(cb) {
            checkTemperatureThreshold(event, cb);
        },
        function(cb) {
            checkIntegratedTemperatureThreshold(event, cb)
        }
    ], function(err) {
        if (err) {
            logger.error(err);
        }
        done()
    });
}


function onActionCreated(event) {
    var productId = event.action.product;
    // logger.info('type ' + event.action.type + ' product ' + productId);
    if (event.action.type !== '_reset' && productId !== 'UESa5CTb63ApGkDKGdnXNfPg') { // personal dosimeter
        done();
        return;
    }
    var thng = event.action.thng;
    logger.info('Reset action for thng=' + thng + ' has been created.');

    updateProperty(thng, 'integrated_temp', 0, done);
}


// ....... SCRAP

function onThngPropertiesChanged(event) {
    var placeChange = event.changes['current_place'];
    var temperatureChange = event.changes['temperature'];


    if (temperatureChange) {
        var newValue = temperatureChange.newValue;
        logger.info('New temperature value: '+ newValue);
        if (newValue > 30) {
            var toDisplay = "New temp is now "+newValue;
            notify(toDisplay, done);
        } else {
            logger.debug('no need to Slack!');
            done();
        }


    } else {
        logger.debug('No temperature change');
        done();
    }
}

function integrateTemperature(event, callback) {
    var temperatureChange = event.changes['temperature']; // CST
    vat tempTimestampChange = event.changes['temp_timestamp'];
    var thng = event.thng;

    if (!temperatureChange) {
        callback();
        return;
    }

    EVT.api({
        url: '/thngs/' + thng.id+ '/properties/temperature',
        params: {
            perPage: '2'
        },
        authorization : 'Jcp1ZhRc4Ee1p8SuYQOp9KecPqXHStVDq9vTXgWYmmlYOPTjyclg2eMvPSeSxRDVFpddPZdVavtsSuTS'
    }).then(function (history) {
        if (history.length !== 2) {
            callback();
        } else {
            var latest = history[0];
            var oldest = history[1];

            var timeDifference = latest.timestamp - oldest.timestamp;
            var value = temperatureChange.oldValue;

            logger.debug('timeDiff '+timeDifference+' value '+value+' check '+oldest.value);
            callback();
        }

    }, function(err) {
        callback(err);
    })

}

EVT.api({
    url: '/thngs/' + thngId+ '/properties/' + key,
    method : 'put',
    body: [{
        value: value
    }],
    authorization : 'Jcp1ZhRc4Ee1p8SuYQOp9KecPqXHStVDq9vTXgWYmmlYOPTjyclg2eMvPSeSxRDVFpddPZdVavtsSuTS'
}).then(function () {
    callback();
}, function(err) {
    callback(err);
});
