'use strict';
// Run during setup on the TV. App artwork stays on its owner's television.
var fs=require('fs'),path=require('path'),vm=require('vm');
var ID=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
var signature=Buffer.from([137,80,78,71,13,10,26,10]);
function readIcon(folder,name){
 if(typeof name!=='string'||path.isAbsolute(name))throw Error('Expected a relative app icon');
 var root=fs.realpathSync(folder),file=fs.realpathSync(path.resolve(root,name));
 if(file.indexOf(root+path.sep)!==0)throw Error('Icon must remain inside its app');
 var stat=fs.statSync(file);
 if(!stat.isFile()||stat.size<33||stat.size>512*1024)throw Error('Invalid icon size');
 var bytes=fs.readFileSync(file);
 if(!bytes.slice(0,8).equals(signature)||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Expected PNG app artwork');
 var width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<1||height<1||width>1024||height>1024)throw Error('Invalid icon dimensions');
 return bytes;
}
function syncIcons(apps,roots,destination){
 if(!Array.isArray(apps)||apps.length>100)throw Error('Invalid shortcut list');
 try{fs.mkdirSync(destination,0o755);}catch(e){if(e.code!=='EEXIST')throw e;}
 if(!fs.lstatSync(destination).isDirectory())throw Error('Icon destination must be a directory');
 var result={copied:[],missing:[]};
 apps.forEach(function(app){
  if(!app||typeof app.id!=='string'||!ID.test(app.id))throw Error('Invalid shortcut ID');
  var bytes=null;
  roots.some(function(root){
   var folder=path.join(root,app.id),info;
   try{info=JSON.parse(fs.readFileSync(path.join(folder,'appinfo.json'),'utf8'));if(info.id!==app.id)return false;}catch(e){return false;}
   return [info.largeIcon,info.icon].some(function(name){try{bytes=readIcon(folder,name);return true;}catch(e){return false;}});
  });
  var file=path.join(destination,app.id+'.png');
  if(bytes){fs.writeFileSync(file+'.new',bytes,{mode:0o644});fs.renameSync(file+'.new',file);result.copied.push(app.id);}
  else{try{fs.unlinkSync(file);}catch(e){if(e.code!=='ENOENT')throw e;}result.missing.push(app.id);}
 });
 return result;
}
module.exports={syncIcons:syncIcons,readIcon:readIcon};
if(require.main===module){
 var appRoot='/media/developer/apps/usr/palm/applications/com.paulbuttle.glasshome',context={window:{}};
 vm.runInNewContext(fs.readFileSync(appRoot+'/config.js','utf8'),context,{timeout:1000});
 var result=syncIcons(context.window.DashboardConfig.apps,[
  '/media/cryptofs/apps/usr/palm/applications',
  '/media/developer/apps/usr/palm/applications',
  '/usr/palm/applications'
 ],appRoot+'/assets/app-icons');
 console.log('Official app icons copied: '+result.copied.length+'.'+(result.missing.length?' Text fallback: '+result.missing.join(', ')+'.':''));
}
