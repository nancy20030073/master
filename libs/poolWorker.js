var Stratum = require('stratum-pool');
var Vardiff = require('stratum-pool/lib/varDiff.js');
var net     = require('net');
var redis = require('redis');
var redisClient;

var MposCompatibility = require('./mposCompatibility.js');
var ShareProcessor = require('./shareProcessor.js');

module.exports = function(logger){

    

    var poolConfigs  = JSON.parse(process.env.pools);
    var portalConfig = JSON.parse(process.env.portalConfig);

    var forkId       = process.env.forkId;
    
    var pools        = {};
    var varDiffsInstances = {}; // contains all the vardiffs for the profit switching pool

    var proxyStuff = {}

    

    //Handle messages from master process sent via IPC
    process.on('message', function(message) {
        switch(message.type){
            case 'blocknotify':
                var pool = pools[message.coin.toLowerCase()]
                if (pool) pool.processBlockNotify(message.hash)
                break;
            case 'switch':
                var newCoinPool = pools[message.coin.toLowerCase()];
                if (newCoinPool) {
                    var oldPool = pools[proxyStuff.curActivePool];
                    oldPool.relinquishMiners(
                        function (miner, cback) { 
                            // relinquish miners that are attached to one of the "Auto-switch" ports and leave the others there.
                            cback(typeof(portalConfig.proxy.ports[miner.client.socket.localPort]) !== 'undefined')
                        }, 
                        function (clients) {
                            newCoinPool.attachMiners(clients);
                            proxyStuff.curActivePool = message.coin.toLowerCase();
                        }
                    )
                    
                }
                break;
        }
    });


    Object.keys(poolConfigs).forEach(function(coin) {

        var poolOptions = poolConfigs[coin];

        var logIdentify = 'Pool Fork ' + forkId + ' (' + coin + ')';

        var poolLogger = {
            debug: function(key, text){
                logger.logDebug(logIdentify, key, text);
            },
            warning: function(key, text){
                logger.logWarning(logIdentify, key, text);
            },
            error: function(key, text){
                logger.logError(logIdentify, key, text);
            }
        };

        var handlers = {
            auth: function(){},
            share: function(){},
            diff: function(){}
        };

        var shareProcessing = poolOptions.shareProcessing;

        //Functions required for MPOS compatibility
        if (shareProcessing.mpos && shareProcessing.mpos.enabled){
            var mposCompat = new MposCompatibility(poolLogger, poolOptions)

            handlers.auth = function(workerName, password, authCallback){
                mposCompat.handleAuth(workerName, password, authCallback);
            };

            handlers.share = function(isValidShare, isValidBlock, data){
                mposCompat.handleShare(isValidShare, isValidBlock, data);
            };

            handlers.diff = function(workerName, diff){
                mposCompat.handleDifficultyUpdate(workerName, diff);
            }
        }

        //Functions required for internal payment processing
        else if (shareProcessing.internal && shareProcessing.internal.enabled){

            var connectToRedis = function(){
                var reconnectTimeout;
                redisClient = redis.createClient(shareProcessing.internal.redis.port, shareProcessing.internal.redis.host);
                redisClient.on('ready', function(){
                    clearTimeout(reconnectTimeout);
                    poolLogger.debug('redis', 'Successfully connected to redis database');
                }).on('error', function(err){
                        poolLogger.error('redis', 'Redis client had an error: ' + JSON.stringify(err))
                }).on('end', function(){
                    poolLogger.error('redis', 'Connection to redis database as been ended');
                    poolLogger.warning('redis', 'Trying reconnection in 3 seconds...');
                    reconnectTimeout = setTimeout(function(){
                        connectToRedis();
                    }, 3000);
                });
            };
            connectToRedis();
            
            var shareProcessor = new ShareProcessor(poolLogger, poolOptions)

            handlers.auth = function(workerName, password, authCallback){
                pool.daemon.cmd('validateaddress', [workerName], function(results){
                    var isValid = results.filter(function(r){return r.response.isvalid}).length > 0;
                    if(isValid){
                        authCallback(isValid);
                    }else{
                        var worker = workerName.split('.')[0];
                        redisClient.hget(coin+'_worker_address',worker,function(error, result){
                            isValid = result?true:false;
                            console.log(result);
                            poolLogger.debug('auth_register_user', workerName);
                            authCallback(isValid);
                        });
                    }
                });
            };

            handlers.share = function(isValidShare, isValidBlock, data){
                shareProcessor.handleShare(isValidShare, isValidBlock, data);
            };
        }

        var authorizeFN = function (ip, workerName, password, callback) {
            handlers.auth(workerName, password, function(authorized){

                var authString = authorized ? 'Authorized' : 'Unauthorized ';

                poolLogger.debug('client', authString + ' [' + ip + '] ' + workerName + ':' + password);
                callback({
                    error: null,
                    authorized: authorized,
                    disconnect: false
                });
            });
        };


        var pool = Stratum.createPool(poolOptions, authorizeFN);
        pool.on('share', function(isValidShare, isValidBlock, data){

            var shareData = JSON.stringify(data);

            if (data.solution && !isValidBlock)
                poolLogger.debug('client', 'We thought a block solution was found but it was rejected by the daemon, share data: ' + shareData);
            else if (isValidBlock)
                poolLogger.debug('client', 'Block found, solution: ' + data.solution);

            if (isValidShare)
                poolLogger.debug('client', 'Valid share submitted, share data: ' + shareData);
            else if (!isValidShare)
                poolLogger.debug('client', 'Invalid share submitted, share data: ' + shareData)


            handlers.share(isValidShare, isValidBlock, data)


        }).on('difficultyUpdate', function(workerName, diff){
            handlers.diff(workerName, diff);
        }).on('log', function(severity, logKey, logText) {
            if (severity == 'debug') {
                poolLogger.debug(logKey, logText);
            } else if (severity == 'warning') {
                poolLogger.warning(logKey, logText);
            } else if (severity == 'error') {
                poolLogger.error(logKey, logText);
            }
        });
        pool.start();
        pools[poolOptions.coin.name.toLowerCase()] = pool;
    });

    
    if (typeof(portalConfig.proxy) !== 'undefined' && portalConfig.proxy.enabled === true) {
        proxyStuff.curActivePool = Object.keys(pools)[0];
        proxyStuff.proxys = {};
        proxyStuff.varDiffs = {};
        Object.keys(portalConfig.proxy.ports).forEach(function(port) {
            proxyStuff.varDiffs[port] = new Vardiff(port, portalConfig.proxy.ports[port].varDiff);
        });
        Object.keys(pools).forEach(function (coinName) {
            var p = pools[coinName];
            Object.keys(proxyStuff.varDiffs).forEach(function(port) {
                p.setVarDiff(port, proxyStuff.varDiffs[port]);
            });
        });

        Object.keys(portalConfig.proxy.ports).forEach(function (port) {
            proxyStuff.proxys[port] = net .createServer({allowHalfOpen: true}, function(socket) {
                console.log(proxyStuff.curActivePool);
                pools[proxyStuff.curActivePool].getStratumServer().handleNewClient(socket);
            }).listen(parseInt(port), function(){
                console.log("Proxy listening on " + port);
            });
        });


        
    }
};