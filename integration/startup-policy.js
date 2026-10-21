'use strict';
// Keep LG's *next-start* input pointed at Glass Home. Never launch over a viewer.
module.exports=function(options){
 var timer=null,busy=false,again=false,stopped=false;
 function schedule(delay){if(stopped)return;if(timer!==null)options.clearTimeout(timer);timer=options.setTimeout(function(){timer=null;reconcile();},delay);}
 function reconcile(){
  if(stopped||!options.enabled())return;
  if(busy){again=true;return;}
  var current;try{current=options.readInput();}catch(e){schedule(5000);return;}
  if(current&&current.type==='MVPD_IP'&&current.appId==='com.paulbuttle.glasshome')return;
  busy=true;options.setPreferred(function(error){busy=false;if(stopped)return;if(error){schedule(5000);return;}if(again){again=false;schedule(80);}});
 }
 return {start:reconcile,changed:function(){schedule(80);},stop:function(){stopped=true;if(timer!==null)options.clearTimeout(timer);timer=null;}};
};
