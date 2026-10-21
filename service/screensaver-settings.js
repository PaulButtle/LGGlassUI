'use strict';
var fs=require('fs'),path=require('path');
function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(function(k){return ['mode','interval','fit','dim'].indexOf(k)<0;}))throw Error('Invalid screensaver settings.');
 if(['lg','frame'].indexOf(input.mode)<0)throw Error('Choose LG Fireworks or Frame Photographs.');
 if(input.interval!==undefined&&[30,60,120,300].indexOf(input.interval)<0)throw Error('Invalid photograph interval.');
 if(input.fit!==undefined&&['contain','cover'].indexOf(input.fit)<0)throw Error('Invalid photograph fit.');
 if(input.dim!==undefined&&[0.55,0.78,1].indexOf(input.dim)<0)throw Error('Invalid photograph brightness.');
 return {mode:input.mode,interval:input.interval||60,fit:input.fit||'contain',dim:0.55};
}
function normalize(input){try{return validate(input);}catch(e){return {mode:'lg',interval:60,fit:'contain',dim:0.55};}}
function read(dir){try{return normalize(JSON.parse(fs.readFileSync(path.join(dir,'screensaver.json'),'utf8')));}catch(e){return normalize(null);}}
function status(file){try{var value=JSON.parse(fs.readFileSync(file,'utf8'));if(Date.now()-value.updatedAt>90000)throw Error();return {available:value.available===true,applied:value.applied==='frame'?'frame':'lg',error:typeof value.error==='string'?value.error:''};}catch(e){return {available:false,applied:'lg',error:'Screensaver integration is not available. Update Glass Home setup on a supported TV.'};}}
module.exports={validate:validate,normalize:normalize,read:read,status:status};
