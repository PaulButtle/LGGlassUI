'use strict';
// Root-only metadata watcher. No network listener and no foreground launches.
var fs=require('fs'),luna=require('./luna.js'),base='/var/lib/glass-home',request=null;
var policy=require('./startup-policy.js')({
 setTimeout:setTimeout,clearTimeout:clearTimeout,
 enabled:function(){return !fs.existsSync(base+'/disabled')&&fs.existsSync(base+'/native-startup')&&fs.existsSync('/media/developer/apps/usr/palm/applications/com.paulbuttle.glasshome/appinfo.json');},
 readInput:function(){return JSON.parse(fs.readFileSync('/var/lib/eim/lastinput','utf8'));},
 setPreferred:function(done){request=luna('luna://com.webos.service.eim/setLastInput',{type:'MVPD_IP',appId:'com.paulbuttle.glasshome'},function(error){request=null;if(error)console.error(error.message);else console.log('Native startup preference restored');done(error);});}
});
var watcher=fs.watch('/var/lib/eim',function(event,name){if(!name||String(name)==='lastinput')policy.changed();});
watcher.on('error',function(error){console.error('Input watcher:',error.message);});
policy.start();
// Read-only fallback for missed filesystem events; only writes on a mismatch.
setInterval(policy.start,30000);
setInterval(function(){['/tmp/glass-hook-lginput2.log','/tmp/glass-hook-micomservice.log','/tmp/glass-controller.log'].forEach(function(file){try{if(fs.statSync(file).size>262144)fs.truncateSync(file,0);}catch(e){}});},60000);
process.on('SIGTERM',function(){policy.stop();watcher.close();if(request)request.kill();process.exit(0);});
