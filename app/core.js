(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.DashboardCore=factory();}}(this,function(){
  'use strict';
  function moveFocus(index,key,columns,count){
    var row=Math.floor(index/columns),col=index%columns;
    if(key==='ArrowRight')return Math.min(index+1,Math.min((row+1)*columns-1,count-1));
    if(key==='ArrowLeft')return Math.max(row*columns,index-1);
    if(key==='ArrowDown')return Math.min(count-1,index+columns);
    if(key==='ArrowUp')return Math.max(0,(row-1)*columns+col);
    return index;
  }
  function savedFocus(raw,count){var n=Number(raw);return Number.isInteger(n)&&n>=0&&n<count?n:0;}
  function preferences(raw){var p={};try{p=JSON.parse(raw)||{};}catch(e){}
    return {interval:[30,60,120,300].indexOf(p.interval)>=0?p.interval:60,fit:p.fit==='cover'?'cover':'contain',duration:[15,30,60].indexOf(p.duration)>=0?p.duration:30,dim:[0.55,0.78,1].indexOf(p.dim)>=0?p.dim:0.78};
  }
  function nextPhoto(photos,index,failed){for(var n=1;n<=photos.length;n++){var i=(index+n)%photos.length;if(!failed[photos[i].id])return i;}return -1;}
  function greeting(hour,name){var text='Good '+(hour<12?'morning':hour<18?'afternoon':'evening');return text+(typeof name==='string'&&name.trim()?', '+name.trim():'');}
  return {greeting:greeting,savedFocus:savedFocus,moveFocus:moveFocus,preferences:preferences,nextPhoto:nextPhoto};
}));
