'use strict';
// Keep stdin open on this webOS firmware until the Luna reply is complete.
const cp=require('child_process');const uri=process.argv[2],payload=process.argv[3]||'{}';
if(!uri||!uri.startsWith('luna://'))throw Error('Supply a Luna URI and a JSON payload');JSON.parse(payload);
const quote=s=>"'"+s.replace(/'/g,"'\\''")+"'";
const command='sleep 3 | luna-send -n 1 -w 2500 '+quote(uri)+' '+quote(payload);
process.stdout.write(cp.execFileSync(__dirname+'/tv-ssh',[command],{encoding:'utf8'}));
