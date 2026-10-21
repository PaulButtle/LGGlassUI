'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function simulate(installed=true){
 const calls=[],config={token:'b'.repeat(36),greetingName:'Alex and Sam',tvAddress:'tv.local'};
 const app={running:true,greeting:'',saved:''};
 const source=fs.readFileSync(path.join(__dirname,'../scripts/deploy.cjs'),'utf8');
 const ssh=(command,input)=>{
  calls.push(command);
  if(command.startsWith('if [ -f /media/internal/glass-home/service/config.json'))return JSON.stringify(config);
  if(command.includes('appInstallService/dev/install'))return JSON.stringify(installed?{statusValue:30,details:{state:'installed'}}:{statusValue:26,details:{state:'failed'}});
  if(command.includes('config.local.js.new')){const context={window:{DashboardConfig:{}}};vm.runInNewContext(input,context);app.saved=context.window.DashboardConfig.greetingName;}
  if(command.includes('closeByAppId')){app.running=false;return '{"returnValue":true}';}
  if(command.includes('applicationManager/launch')){if(!app.running)app.greeting=app.saved;app.running=true;return '{"returnValue":true}';}
  return '';
 };
 const fakeFs={readFileSync(file){if(file==='.local/private-config.json')return JSON.stringify(config);if(file==='app/appinfo.json')return '{"version":"1.2.0"}';return Buffer.from('public package');},statSync(){return {isFile:()=>true};},readdirSync(){return [];}};
 const context={__dirname:path.join(__dirname,'../scripts'),process:{argv:['node','deploy.cjs','--ipk','public.ipk'],chdir(){}},console:{log(){}},require(name){if(name==='fs')return fakeFs;if(name==='./ssh.cjs')return {ssh};if(name==='./lib/setup.cjs')return require('../scripts/lib/setup.cjs');return require(name);}};
 let error;try{vm.runInNewContext(source,context);}catch(e){error=e;}
 return {calls,app,error};
}
test('an app reopened by the native installer is restarted after private settings arrive',()=>{
 const result=simulate();assert.equal(result.error,undefined);
 assert.equal(result.app.greeting,'Alex and Sam');assert.equal(result.app.running,true);
});
test('an unsuccessful native installation never writes private settings or replaces integration',()=>{
 const result=simulate(false);assert.match(result.error.message,/did not confirm/);
 assert.equal(result.calls.some(c=>c.includes('config.local.js')||c.includes('mkdir -p /media/internal/glass-home/integration')),false);
});
