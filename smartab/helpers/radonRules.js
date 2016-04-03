// @filter(onActionCreated) thng.name=RadonDetector
function onThngPropertiesChanged(event) {
//    var user = new EVT.User('6JGcFmD0Zg8cZ1zmK4zNpdnNjgDHEnd7LRuW3M1474jIxiHTwxuxlyOeRatScno7vib4i0P3Dh42XGYO');
//    user.thng().read().then(function(thngs) {
//        logger.info(thngs);
//    });
    if(event.thng.properties.concentration>100 && (!global.fanOn)) {        
        logger.info('Turning the fan on');
        global.fanOn = true;
        app.action('_fanOn').create({
            thng:'UXQWgh5UKtqDBfSATSCe2pym'
        });
    }
    if(event.thng.properties.concentration<50) {
        logger.info('Turning the fan off');
        global.fanOn = false;
        app.action('_fanOff').create({
            thng:'UXQWgh5UKtqDBfSATSCe2pym'
        });
    }     
    done();
}