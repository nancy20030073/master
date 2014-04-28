# NOMP ![NOMP Logo](http://zone117x.github.io/node-open-mining-portal/logo.svg "NOMP Logo")
#### Node Open Mining Portal

This portal is an extremely efficient, highly scalable, all-in-one, easy to setup cryptocurrency mining pool written
entirely in Node.js. It contains a stratum poolserver; reward/payment/share processor; and a (*not yet completed*)
responsive user-friendly front-end website featuring mining instructions, in-depth live statistics, and an admin center.

#### Table of Contents
* [Features](#features)
  * [Attack Mitigation](#attack-mitigation)
  * [Security](#security)
  * [Planned Features](#planned-features)
* [Community Support](#community--support)
* [Usage](#usage)
  * [Requirements](#requirements)
  * [Setting Up Coin Daemon](#0-setting-up-coin-daemon)
  * [Downloading & Installing](#1-downloading--installing)
  * [Configuration](#2-configuration)
    * [Portal Config](#portal-config)
    * [Coin Config](#coin-config)
    * [Pool Config](#pool-config)
    * [Setting Up Blocknotify](#optional-recommended-setting-up-blocknotify)
  * [Starting the Portal](#3-start-the-portal)
  * [Upgrading NOMP](#upgrading-nomp)
* [Donations](#donations)
* [Credits](#credits)
* [License](#license)




### Features

* For the pool server it uses the highly efficient [node-stratum-pool](//github.com/zone117x/node-stratum-pool) module which
supports vardiff, POW & POS, transaction messages, anti-DDoS, IP banning, [several hashing algorithms](//github.com/zone117x/node-stratum-pool#hashing-algorithms-supported).

* The portal has an [MPOS](//github.com/MPOS/php-mpos) compatibility mode so that the it can
function as a drop-in-replacement for [python-stratum-mining](//github.com/Crypto-Expert/stratum-mining). This
mode can be enabled in the configuration and will insert shares into a MySQL database in the format which MPOS expects.
For a direct tutorial see the wiki page [Setting up NOMP for MPOS usage](//github.com/zone117x/node-open-mining-portal/wiki/Setting-up-NOMP-for-MPOS-usage).

* Multi-pool ability - this software was built from the ground up to run with multiple coins simultaneously (which can
have different properties and hashing algorithms). It can be used to create a pool for a single coin or for multiple
coins at once. The pools use clustering to load balance across multiple CPU cores.

* For reward/payment processing, shares are inserted into Redis (a fast NoSQL key/value store). The PROP (proportional)
reward system is used with [Redis Transactions](http://redis.io/topics/transactions) for secure and super speedy payouts.
There is zero risk to the pool operator. Shares from rounds resulting in orphaned blocks will be merged into share in the
current round so that each and every share will be rewarded

* This portal does not have user accounts/logins/registrations. Instead, miners simply use their coin address for stratum
authentication. A minimalistic HTML5 front-end connects to the portals statistics API to display stats from from each
pool such as connected miners, network/pool difficulty/hash rate, etc.

* Coin-switching ports using coin-networks and crypto-exchange APIs to detect profitability. Miner's connect to these ports
with their public key which NOMP uses to derive an address for any coin needed to be paid out.


#### Attack Mitigation
* Detects and thwarts socket flooding (garbage data sent over socket in order to consume system resources).
* Detects and thwarts zombie miners (botnet infected computers connecting to your server to use up sockets but not sending any shares).
* Detects and thwarts invalid share attacks:
   * NOMP is not vulnerable to the low difficulty share exploits happening to other pool servers. Other pool server
   software has hardcoded guesstimated max difficulties for new hashing algorithms while NOMP dynamically generates the
   max difficulty for each algorithm based on values founds in coin source code.
   * IP banning feature which on a configurable threshold will ban an IP for a configurable amount of time if the miner
   submits over a configurable threshold of invalid shares.
* NOMP is written in Node.js which uses a single thread (async) to handle connections rather than the overhead of one
thread per connection, and clustering is also implemented so all CPU cores are taken advantage of.


#### Security
NOMP has some implicit security advantages for pool operators and miners:
* Without a registration/login system, non-security-oriented miners reusing passwords across pools is no longer a concern.
* Automated payouts by default and pool profits are sent to another address so pool wallets aren't plump with coins -
giving hackers little reward and keeping your pool from being a target.
* Miners can notice lack of automated payments as a possible early warning sign that an operator is about to run off with their coins.


#### Planned Features

* NOMP API - Used by the website to display stats and information about the pool(s) on the portal's front-end website,
and by the NOMP Desktop app to retrieve a list of available coins (and version-bytes for local wallet/address generation).

* To reduce variance for pools just starting out which have little to no hashing power a feature is planned which will
allow your own pool to connect upstream to a larger pool server. It will request work from the larger pool then
redistribute the work to our own connected miners.


### Community / Support
IRC
* Support / general discussion join #nomp: https://webchat.freenode.net/?channels=#nomp
* Development discussion join #nomp-dev: https://webchat.freenode.net/?channels=#nomp-dev

Join our subreddit [/r/nomp](http://reddit.com/r/nomp)!

*Having problems getting the portal running due to some module dependency error?* It's probably because you
didn't follow the instructions in this README. Please __read the usage instructions__ including [requirements](#requirements) and [downloading/installing](#1-downloading--installing). If you've followed the instructions completely and are still having problems then open an issue here on github or join our #nomp IRC channel and explain your problem :).

If your pool uses NOMP let us know and we will list your website here.

##### Some pools using NOMP or node-stratum-module:
* http://chunkypools.com
* http://clevermining.com
* http://rapidhash.net
* http://suchpool.pw
* http://hashfaster.com
* http://miningpoolhub.com
* http://teamdoge.com
* http://miningwith.us
* http://kryptochaos.com
* http://uberpools.org
* http://onebtcplace.com
* http://minr.es
* http://mining.theminingpools.com
* http://www.omargpools.ca/pools.html
* http://pool.trademybit.com/

Usage
=====


#### Requirements
* Coin daemon(s) (find the coin's repo and build latest version from source)
* [Node.js](http://nodejs.org/) v0.10+ ([follow these installation instructions](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager))
* [Redis](http://redis.io/) key-value store v2.6+ ([follow these instructions](http://redis.io/topics/quickstart))

##### Seriously
Those are legitimate requirements. If you use old versions of Node.js or Redis that may come with your system package manager then you will have problems. Follow the linked instructions to get the last stable versions.

#### 0) Setting up coin daemon
Follow the build/install instructions for your coin daemon. Your coin.conf file should end up looking something like this:
```
daemon=1
rpcuser=litecoinrpc
rpcpassword=securepassword
rpcport=19332
```
For redundancy, its recommended to have at least two daemon instances running in case one drops out-of-sync or offline,
all instances will be polled for block/transaction updates and be used for submitting blocks. Creating a backup daemon
involves spawning a daemon using the `-datadir=/backup` command-line argument which creates a new daemon instance with
it's own config directory and coin.conf file. Learn about the daemon, how to use it and how it works if you want to be
a good pool operator. For starters be sure to read:
   * https://en.bitcoin.it/wiki/Running_bitcoind
   * https://en.bitcoin.it/wiki/Data_directory
   * https://en.bitcoin.it/wiki/Original_Bitcoin_client/API_Calls_list
   * https://en.bitcoin.it/wiki/Difficulty

#### 1) Downloading & Installing

Clone the repository and run `npm update` for all the dependencies to be installed:

```bash
git clone https://github.com/zone117x/node-open-mining-portal.git nomp
cd nomp
npm update
```

#### 2) Configuration

##### Portal config
Inside the `config_example.json` file, ensure the default configuration will work for your environment, then copy the file to `config.json`.

Explanation for each field:
````javascript
{
    /* Specifies the level of log output verbosity. Anything more severy than the level specified
       will also be logged. */
    "logLevel": "debug", //or "warning", "error"


    /* The NOMP CLI (command-line interface) will listen for commands on this port. For example,
       blocknotify messages are sent to NOMP through this. By default listen 0.0.0.0 */
    "cliPort": 17117,

    /* By default 'forks' is set to "auto" which will spawn one process/fork/worker for each CPU
       core in your system. Each of these workers will run a separate instance of your pool(s),
       and the kernel will load balance miners using these forks. Optionally, the 'forks' field
       can be a number for how many forks will be spawned. */
    "clustering": {
        "enabled": true,
        "forks": "auto"
    },

    /* This is the front-end. Its not finished. When it is finished, this comment will say so. */
    "website": {
        "enabled": true,
        "port": 80,
        /* Used for displaying stratum connection data on the Getting Started page. */
        "stratumHost": "cryppit.com",
        "stats": {
            /* Gather stats to broadcast to page viewers and store in redis for historical stats
               every this many seconds. */
            "updateInterval": 15,
            /* How many seconds to hold onto historical stats. Currently set to 24 hours. */
            "historicalRetention": 43200,
            /* How many seconds worth of shares should be gathered to generate hashrate. */
            "hashrateWindow": 300
        },
        /* Not done yet. */
        "adminCenter": {
            "enabled": true,
            "password": "password"
        }
    },

    /* Redis instance of where to store global portal data such as historical stats, proxy states,
       ect.. */
    "redis": {
        "host": "127.0.0.1",
        "port": 6379
    },


    /* With this switching configuration, you can setup ports that accept miners for work based on
       a specific algorithm instead of a specific coin. Miners that connect to these ports are
       automatically switched a coin determined by the server. The default coin is the first
       configured pool for each algorithm and coin switching can be triggered using the
       cli.js script in the scripts folder.

       Miners connecting to these switching ports must use their public key in the format of
       RIPEMD160(SHA256(public-key)). An address for each type of coin is derived from the miner's
       public key, and payments are sent to that address. */
    "switching": {
        "switch1": {
            "enabled": false,
            "algorithm": "sha256",
            "ports": {
                "3333": {
                    "diff": 10,
                    "varDiff": {
                        "minDiff": 16,
                        "maxDiff": 512,
                        "targetTime": 15,
                        "retargetTime": 90,
                        "variancePercent": 30
                    }
                }
            }
        },
        "switch2": {
            "enabled": false,
            "algorithm": "scrypt",
            "ports": {
                "4444": {
                    "diff": 10,
                    "varDiff": {
                        "minDiff": 16,
                        "maxDiff": 512,
                        "targetTime": 15,
                        "retargetTime": 90,
                        "variancePercent": 30
                    }
                }
            }
        },
        "switch3": {
            "enabled": false,
            "algorithm": "x11",
            "ports": {
                "5555": {
                    "diff": 0.001
                }
            }
        }
    },

    "profitSwitch": {
        "enabled": false,
        "updateInterval": 600,
        "depth": 0.90,
        "usePoloniex": true,
        "useCryptsy": true,
        "useMintpal": true
    }
}
````


##### Coin config
Inside the `coins` directory, ensure a json file exists for your coin. If it does not you will have to create it.
Here is an example of the required fields:
````javascript
{
    "name": "Litecoin",
    "symbol": "ltc",
    "algorithm": "scrypt", //or "sha256", "scrypt-jane", "scrypt-n", "quark", "x11"
    "txMessages": false, //or true (not required, defaults to false)
    "mposDiffMultiplier": 256, //only for x11 coins in mpos mode, set to 256 (optional)
}
````

For additional documentation how to configure coins *(especially important for scrypt-n and scrypt-jane coins)*
see [these instructions](//github.com/zone117x/node-stratum-pool#module-usage).


##### Pool config
Take a look at the example json file inside the `pool_configs` directory. Rename it to `yourcoin.json` and change the
example fields to fit your setup.

Description of options:

````javascript
{
    "enabled": true, //Set this to false and a pool will not be created from this config file
    "coin": "litecoin.json", //Reference to coin config file in 'coins' directory

    "address": "mi4iBXbBsydtcc5yFmsff2zCFVX4XG7qJc", //Address to where block rewards are given

    "blockRefreshInterval": 1000, //How often to poll RPC daemons for new blocks, in milliseconds

    /* How many milliseconds should have passed before new block transactions will trigger a new
       job broadcast. */
    "txRefreshInterval": 20000,

    /* Some miner apps will consider the pool dead/offline if it doesn't receive anything new jobs
       for around a minute, so every time we broadcast jobs, set a timeout to rebroadcast
       in this many seconds unless we find a new job. Set to zero or remove to disable this. */
    "jobRebroadcastTimeout": 55,

    //instanceId: 37, //Recommend not using this because a crypto-random one will be generated

    /* Some attackers will create thousands of workers that use up all available socket connections,
       usually the workers are zombies and don't submit shares after connecting. This feature
       detects those and disconnects them. */
    "connectionTimeout": 600, //Remove workers that haven't been in contact for this many seconds

    /* Sometimes you want the block hashes even for shares that aren't block candidates. */
    "emitInvalidBlockHashes": false,

    /* We use proper maximum algorithm difficulties found in the coin daemon source code. Most
       miners/pools that deal with scrypt use a guesstimated one that is about 5.86% off from the
       actual one. So here we can set a tolerable threshold for if a share is slightly too low
       due to mining apps using incorrect max diffs and this pool using correct max diffs. */
    "shareVariancePercent": 10,

    /* Enable for client IP addresses to be detected when using a load balancer with TCP proxy
       protocol enabled, such as HAProxy with 'send-proxy' param:
       http://haproxy.1wt.eu/download/1.5/doc/configuration.txt */
    "tcpProxyProtocol": false,


    /* This determines what to do with submitted shares (and stratum worker authentication).
       You have two options: 
        1) Enable internal and disable mpos = this portal to handle all share payments.
        2) Enable mpos and disable internal = shares will be inserted into MySQL database
           for MPOS to process. */
    "shareProcessing": {

        "internal": {
            "enabled": true,

            /* When workers connect, to receive payments, their address must be used as the worker
               name. If this option is true, on worker authentication, their address will be
               verified via a validateaddress API call to the daemon. Miners with invalid addresses
               will be rejected. */
            "validateWorkerAddress": true,

            /* Every this many seconds get submitted blocks from redis, use daemon RPC to check
               their confirmation status, if confirmed then get shares from redis that contributed
               to block and send out payments. */
            "paymentInterval": 30,

            /* Minimum number of coins that a miner must earn before sending payment. Typically,
               a higher minimum means less transactions fees (you profit more) but miners see
               payments less frequently (they dislike). Opposite for a lower minimum payment. */
            "minimumPayment": 0.001,

            /* Minimum number of coins to keep in pool wallet. It is recommended to deposit at
               at least this many coins into the pool wallet when first starting the pool. */
            "minimumReserve": 10,

            /* (2% default) What percent fee your pool takes from the block reward. */
            "feePercent": 0.02,

            /* Name of the daemon account to use when moving coin profit within daemon wallet. */
            "feeCollectAccount": "feesCollected",

            /* Your address that receives pool revenue from fees. */
            "feeReceiveAddress": "LZz44iyF4zLCXJTU8RxztyyJZBntdS6fvv",

            /* How many coins from fee revenue must accumulate on top of the
               minimum reserve amount in order to trigger withdrawal to fee address. The higher
               this threshold, the less of your profit goes to transactions fees. */
            "feeWithdrawalThreshold": 5,

            /* This daemon is used to send out payments. It MUST be for the daemon that owns the
               configured 'address' that receives the block rewards, otherwise the daemon will not
               be able to confirm blocks or send out payments. */
            "daemon": {
                "host": "127.0.0.1",
                "port": 19332,
                "user": "litecoinrpc",
                "password": "testnet"
            },

            /* Redis database used for storing share and block submission data. */
            "redis": {
                "host": "127.0.0.1",
                "port": 6379
            }
        },

        /* Enabled mpos and shares will be inserted into share table in a MySQL database. You may 
           also want to use the "emitInvalidBlockHashes" option below if you require it. */
        "mpos": { 
            "enabled": false,
            "host": "127.0.0.1", //MySQL db host
            "port": 3306, //MySQL db port
            "user": "me", //MySQL db user
            "password": "mypass", //MySQL db password
            "database": "ltc", //MySQL db database name

            /* Unregistered workers can automatically be registered (added to database) on stratum
               worker authentication if this is true. */
            "autoCreateWorker": false,

            /* For when miner's authenticate: set to "password" for both worker name and password to
               be checked for in the database, set to "worker" for only work name to be checked, or
               don't use this option (set to "none") for no auth checks */
            "stratumAuth": "password"
        }
    },

    /* If a worker is submitting a high threshold of invalid shares we can temporarily ban their IP
       to reduce system/network load. Also useful to fight against flooding attacks. If running
       behind something like HAProxy be sure to enable 'tcpProxyProtocol', otherwise you'll end up
       banning your own IP address (and therefore all workers). */
    "banning": {
        "enabled": true,
        "time": 600, //How many seconds to ban worker for
        "invalidPercent": 50, //What percent of invalid shares triggers ban
        "checkThreshold": 500, //Check invalid percent when this many shares have been submitted
        "purgeInterval": 300 //Every this many seconds clear out the list of old bans
    },

    /* Each pool can have as many ports for your miners to connect to as you wish. Each port can
       be configured to use its own pool difficulty and variable difficulty settings. varDiff is
       optional and will only be used for the ports you configure it for. */
    "ports": {
        "3032": { //A port for your miners to connect to
            "diff": 32, //the pool difficulty for this port

            /* Variable difficulty is a feature that will automatically adjust difficulty for
               individual miners based on their hashrate in order to lower networking overhead */
            "varDiff": {
                "minDiff": 8, //Minimum difficulty
                "maxDiff": 512, //Network difficulty will be used if it is lower than this
                "targetTime": 15, //Try to get 1 share per this many seconds
                "retargetTime": 90, //Check to see if we should retarget every this many seconds
                "variancePercent": 30 //Allow time to very this % from target without retargeting
            }
        },
        "3256": { //Another port for your miners to connect to, this port does not use varDiff
            "diff": 256 //The pool difficulty
        }
    },

    /* For redundancy, recommended to have at least two daemon instances running in case one
       drops out-of-sync or offline. */
    "daemons": [
        {   //Main daemon instance
            "host": "127.0.0.1",
            "port": 19332,
            "user": "litecoinrpc",
            "password": "testnet"
        },
        {   //Backup daemon instance
            "host": "127.0.0.1",
            "port": 19344,
            "user": "litecoinrpc",
            "password": "testnet"
        }
    ],


    /* This allows the pool to connect to the daemon as a node peer to receive block updates.
       It may be the most efficient way to get block updates (faster than polling, less
       intensive than blocknotify script). It requires additional setup: the 'magic' field must
       be exact (extracted from the coin source code). */
    "p2p": {
        "enabled": false,

        /* Host for daemon */
        "host": "127.0.0.1",

        /* Port configured for daemon (this is the actual peer port not RPC port) */
        "port": 19333,

        /* If your coin daemon is new enough (i.e. not a shitcoin) then it will support a p2p
           feature that prevents the daemon from spamming our peer node with unnecessary
           transaction data. Assume its supported but if you have problems try disabling it. */
        "disableTransactions": true,

        /* Magic value is different for main/testnet and for each coin. It is found in the daemon
           source code as the pchMessageStart variable.
           For example, litecoin mainnet magic: http://git.io/Bi8YFw
           And for litecoin testnet magic: http://git.io/NXBYJA */
        "magic": "fcc1b7dc"
    }
}

````

You can create as many of these pool config files as you want (such as one pool per coin you which to operate).
If you are creating multiple pools, ensure that they have unique stratum ports.

For more information on these configuration options see the [pool module documentation](https://github.com/zone117x/node-stratum-pool#module-usage)



##### [Optional, recommended] Setting up blocknotify
1. In `config.json` set the port and password for `blockNotifyListener`
2. In your daemon conf file set the `blocknotify` command to use:
```
node [path to cli.js] [coin name in config] [block hash symbol]
```
Example: inside `dogecoin.conf` add the line
```
blocknotify=node /home/nomp/scripts/cli.js blocknotify dogecoin %s
```

Alternatively, you can use a more efficient block notify script written in pure C. Build and usage instructions
are commented in [scripts/blocknotify.c](scripts/blocknotify.c).


#### 3) Start the portal

```bash
node init.js
```

###### Optional enhancements for your awesome new mining pool server setup:
* Use something like [forever](https://github.com/nodejitsu/forever) to keep the node script running
in case the master process crashes. 
* Use something like [redis-commander](https://github.com/joeferner/redis-commander) to have a nice GUI
for exploring your redis database.
* Use something like [logrotator](http://www.thegeekstuff.com/2010/07/logrotate-examples/) to rotate log 
output from NOMP.
* Use [New Relic](http://newrelic.com/) to monitor your NOMP instance and server performance.


#### Upgrading NOMP
When updating NOMP to the latest code its important to not only `git pull` the latest from this repo, but to also update
the `node-statum-pool` and `node-multi-hashing` modules, and any config files that may have been changed.
* Inside your NOMP directory (where the init.js script is) do `git pull` to get the latest NOMP code.
* Remove the dependenices by deleting the `node_modules` directory with `rm -r node_modules`.
* Run `npm update` to force updating/reinstalling of the dependencies.
* Compare your `config.json` and `pool_configs/coin.json` configurations to the latest example ones in this repo or the ones in the setup instructions where each config field is explained. You may need to modify or add any new changes.

Donations
---------
To support development of this project feel free to donate :)

* BTC: `1KRotMnQpxu3sePQnsVLRy3EraRFYfJQFR`
* LTC: `LKfavSDJmwiFdcgaP1bbu46hhyiWw5oFhE`
* VTC: `VgW4uFTZcimMSvcnE4cwS3bjJ6P8bcTykN`
* MAX: `mWexUXRCX5PWBmfh34p11wzS5WX2VWvTRT`
* QRK: `QehPDAhzVQWPwDPQvmn7iT3PoFUGT7o8bC`
* DRK: `XcQmhp8ANR7okWAuArcNFZ2bHSB81jpapQ`
* DOGE: `DBGGVtwAAit1NPZpRm5Nz9VUFErcvVvHYW`
* Cryptsy Trade Key: `254ca13444be14937b36c44ba29160bd8f02ff76`

Credits
-------
* [Jerry Brady / mintyfresh68](https://github.com/bluecircle) - got coin-switching fully working and developed proxy-per-algo feature
* [Tony Dobbs](http://anthonydobbs.com) - designs for front-end and created the NOMP logo
* [LucasJones](//github.com/LucasJones) - got p2p block notify working and implemented additional hashing algos
* [vekexasia](//github.com/vekexasia) - co-developer & great tester
* [TheSeven](//github.com/TheSeven) - answering an absurd amount of my questions and being a very helpful gentleman
* [UdjinM6](//github.com/UdjinM6) - helped implement fee withdrawal in payment processing
* [Alex Petrov / sysmanalex](https://github.com/sysmanalex) - contributed the pure C block notify script
* [svirusxxx](//github.com/svirusxxx) - sponsored development of MPOS mode
* [icecube45](//github.com/icecube45) - helping out with the repo wiki
* Those that contributed to [node-stratum-pool](//github.com/zone117x/node-stratum-pool#credits)


License
-------
Released under the GNU General Public License v2

http://www.gnu.org/licenses/gpl-2.0.html
