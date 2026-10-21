'use strict';
// A fixed, reversible bind mount only. No network listener or arbitrary commands.
var fs=require('fs'),native=require('./screensaver-native.js'),luna=require('./luna.js'),busy=false,pending=false,closing=null;
function reconcile(){
 if(busy){pending=true;return;}busy=true;
 try{var result=native.apply();if(result.changed){closing=luna('luna://com.webos.applicationManager/closeByAppId',{id:'com.webos.app.screensaver'},function(){closing=null;done();});return;}}
 catch(e){console.error(e.message);}done();
}
function done(){busy=false;if(pending){pending=false;reconcile();}}
var watcher=fs.watch('/media/internal/glass-home/photos',function(event,name){if(!name||String(name)==='screensaver.json')reconcile();});
watcher.on('error',function(e){console.error(e.message);});
var timer=setInterval(reconcile,30000);reconcile();
process.on('SIGTERM',function(){clearInterval(timer);watcher.close();if(closing)closing.kill();process.exit(0);});
