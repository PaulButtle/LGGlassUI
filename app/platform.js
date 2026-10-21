(function(){'use strict';var bridges=[];
 function request(uri,payload){return new Promise(function(resolve,reject){
   var Bridge=window.PalmServiceBridge||window.webOSServiceBridge;if(!Bridge){reject(Error('This control is available on your TV.'));return;}
   var b=new Bridge(),done=false;bridges.push(b);
   function finish(error,value){if(done)return;done=true;clearTimeout(timer);try{b.cancel();}catch(e){}bridges.splice(bridges.indexOf(b),1);if(error)reject(error);else resolve(value);}
   var timer=setTimeout(function(){finish(Error('The TV did not respond. Please try again.'));},6000);
   b.onservicecallback=function(raw){try{var r=JSON.parse(raw);finish(r.returnValue===false?Error(r.errorText||'The TV could not open this app.'):null,r);}catch(e){finish(e);}};
   try{b.call(uri,JSON.stringify(payload));}catch(e){finish(e);}
 });}
 window.DashboardPlatform={request:request,launch:function(id){return request('luna://com.webos.applicationManager/launch',{id:id});},isTV:!!(window.PalmSystem||window.webOSSystem)};
}());
