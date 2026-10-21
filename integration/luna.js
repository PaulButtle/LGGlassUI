'use strict';
var cp=require('child_process');
// Keep stdin open on webOS 5.6 until a reply arrives; EOF exits luna-send early.
module.exports=function(uri,payload,callback){
 var child=cp.spawn('/usr/bin/luna-send',['-n','1','-w','2500',uri,JSON.stringify(payload)],{stdio:['pipe','pipe','ignore']}),buffer='',finished=false,reply=null;
 var timeout=setTimeout(function(){child.kill();done(Error('Native request timed out'));},3500);
 function done(error,value){if(finished)return;finished=true;clearTimeout(timeout);callback(error,value);}
 child.stdout.on('data',function(bytes){buffer+=bytes.toString();if(buffer.length>65536){child.kill();done(Error('Native reply exceeded limit'));return;}try{reply=JSON.parse(buffer);}catch(e){return;}});
 child.on('error',function(error){done(error);});
 // Let -n 1 exit normally before a callback can start another child. This avoids
 // overlapping pipe teardown on the TV's old Node/libuv runtime.
 child.on('close',function(code){if(!finished)done(code===0&&reply&&reply.returnValue===true?null:Error(reply&&reply.errorText||'Native request ended without a successful reply'),reply);});
 return child;
};
