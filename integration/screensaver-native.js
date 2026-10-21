'use strict';
var fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),patch=require('./screensaver-patch.js'),settings=require('../service/screensaver-settings.js');
var base='/var/lib/glass-home',target='/usr/palm/applications/com.webos.app.screensaver/qml/main.qml',overlay=base+'/screensaver-main.qml',backup=base+'/screensaver-main.before.qml',dir='/media/internal/glass-home/photos';
var statusFile='/media/internal/glass-home/service/screensaver-status.json';
var supportedHash='5f41317ded2294fc61407f8527d76de93df65d4566c9c2fd2cfcf6e2f0e9894d';
function hash(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function state(){
 var mounted=fs.readFileSync('/proc/self/mountinfo','utf8').split('\n').some(function(line){return line.split(' ')[4]===target;}),owned=false;
 if(mounted&&fs.existsSync(overlay)){var a=fs.statSync(target),b=fs.statSync(overlay);owned=a.ino===b.ino&&a.dev===b.dev;}
 var source=owned?(fs.existsSync(backup)?fs.readFileSync(backup):Buffer.alloc(0)):(mounted?Buffer.alloc(0):fs.readFileSync(target));
 return {mounted:mounted,owned:owned,source:source,supported:hash(source)===supportedHash};
}
function applyUnlocked(){
 var current,changed=false,error='',available=false;
 try{
  current=state();available=current.supported&&(!current.mounted||current.owned);
  var action=patch.decide(settings.read(dir).mode,current.supported,current.mounted,current.owned);
  if(action==='conflict')throw Error('Another custom screensaver is installed. Its overlay was left in place.');
  if(action==='unsupported')throw Error('Frame Photographs is not verified for this TV firmware. LG screensaver retained.');
  if(action==='unmount'){cp.execFileSync('/bin/umount',[target]);changed=true;}
  if(action==='mount'){
   // File ownership is root-only; no unprivileged path is passed to mount.
   fs.writeFileSync(backup,current.source,{mode:0o600});
   fs.writeFileSync(overlay+'.new',patch.insert(current.source.toString()),{mode:0o644});fs.renameSync(overlay+'.new',overlay);
   cp.execFileSync('/bin/mount',['--bind',overlay,target]);changed=true;
  }
  current=state();
  if(!available&&!error)error='Frame Photographs is not verified for this TV firmware.';
 }catch(e){error=e.message;try{current=state();}catch(ignore){current={owned:false};}}
 var result={available:available,applied:current&&current.owned?'frame':'lg',error:error,updatedAt:Date.now()};
 fs.writeFileSync(statusFile+'.new',JSON.stringify(result),{mode:0o644});fs.renameSync(statusFile+'.new',statusFile);
 return {changed:changed,status:result};
}
function apply(){
 // Serialize the watcher and SSH recovery, including mount-state inspection.
 return JSON.parse(cp.execFileSync('/usr/bin/flock',['-w','5',base+'/screensaver.lock','/usr/bin/node',__filename,'apply-locked'],{encoding:'utf8',timeout:10000}));
}
function disable(){
 // The destination directory belongs to the photo user. Create an unpredictable
 // exclusive temporary file so recovery cannot follow an unprivileged symlink.
 var file=dir+'/.screensaver-'+crypto.randomBytes(12).toString('hex');
 fs.writeFileSync(file,JSON.stringify(settings.normalize(null)),{flag:'wx',mode:0o600});fs.chownSync(file,6861,6861);fs.renameSync(file,dir+'/screensaver.json');
 return apply();
}
module.exports={apply:apply,disable:disable};
if(require.main===module){
 if(process.argv[2]==='apply-locked')console.log(JSON.stringify(applyUnlocked()));
 else {var result=process.argv[2]==='disable'?disable():apply();console.log(JSON.stringify(result.status));if(result.status.error)process.exitCode=1;
  if(result.changed)require('./luna.js')('luna://com.webos.applicationManager/closeByAppId',{id:'com.webos.app.screensaver'},function(){});
 }
}
