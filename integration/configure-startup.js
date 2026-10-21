'use strict';
var fs=require('fs'),luna=require('./luna.js'),dir='/var/lib/glass-home',appId='com.paulbuttle.glasshome',mode=process.argv[2];
function fail(error){console.error(error.message);process.exitCode=1;}
if(mode!=='enable'&&mode!=='disable')throw Error('Use enable or disable');
if(!fs.existsSync(dir))fs.mkdirSync(dir);
var backup=dir+'/lastinput.before.json',marker=dir+'/native-startup';
if(mode==='enable'){
 var info=JSON.parse(fs.readFileSync('/media/developer/apps/usr/palm/applications/'+appId+'/appinfo.json','utf8'));
 if(!info.supportGIP||!info.largeIcon)throw Error('Install the app with supportGIP and largeIcon before enabling native startup');
 if(!fs.existsSync(backup)){
  var old=JSON.parse(fs.readFileSync('/var/lib/eim/lastinput','utf8'));
  if(old.appId===appId)throw Error('Original input backup is missing. Restore the pre-install backup before enabling.');
  fs.writeFileSync(backup,JSON.stringify(old),{mode:384,flag:'wx'});
 }
 luna('luna://com.webos.service.eim/addDevice',{appId:appId,pigImage:'',mvpdIcon:'',showPopup:false,label:'Glass Home',description:'Your personal dashboard'},function(error){
  if(error)return fail(error);
  luna('luna://com.webos.service.eim/setLastInput',{type:'MVPD_IP',appId:appId},function(error){if(error)return fail(error);fs.writeFileSync(marker,'enabled\n',{mode:384});console.log('Glass Home is the native startup input.');});
 });
}else{
 if(fs.existsSync(marker))fs.unlinkSync(marker);
 if(!fs.existsSync(backup))throw Error('Original input backup is missing; no input changes made');
 var before=JSON.parse(fs.readFileSync(backup,'utf8'));
 if(typeof before.type!=='string'||typeof before.appId!=='string'||before.appId===appId)throw Error('Original input backup is invalid');
 luna('luna://com.webos.service.eim/deleteDevice',{appId:appId},function(error){
  if(error)console.error('Input unregister:',error.message);
  luna('luna://com.webos.service.eim/setLastInput',{type:before.type,appId:before.appId},function(error){if(error)return fail(error);console.log('Original startup input restored.');});
 });
}
