'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateConnection,chooseConfig,browserConfig,verifyBundle}=require('../scripts/lib/setup.cjs');
const token='a'.repeat(36);
test('connection rejects SSH option injection and invalid ports',()=>{
 for(const host of ['-oProxyCommand=bad','tv;id','tv\nother',''])assert.throws(()=>validateConnection({host,port:22,key:'/tmp/key'}));
 for(const port of [0,65536,22.5,'22;id'])assert.throws(()=>validateConnection({host:'tv.local',port,key:'/tmp/key'}));
 assert.equal(validateConnection({host:'tv.local',port:'2222',key:'/tmp/my key'}).port,2222);
});
test('fresh installations get distinct keys; upgrades adopt the TV key without rotating it',()=>{
 const a=chooseConfig(null,null,'tv.local'),b=chooseConfig(null,null,'tv.local');
 assert.match(a.token,/^[a-f0-9]{36}$/);assert.notEqual(a.token,b.token);
 const existing={...a,greetingName:'Alex'};
 assert.equal(chooseConfig(null,existing,'tv.local').token,a.token);
 assert.equal(chooseConfig(null,existing,'tv.local').greetingName,'Alex');
 assert.throws(()=>chooseConfig(a,b,'tv.local'),/different/);
 assert.throws(()=>chooseConfig({...a,tvAddress:'other.local'},null,'tv.local'),/different TV/);
});
test('browser configuration contains only display settings and safely serializes text',()=>{
 const vm=require('node:vm'),context={window:{DashboardConfig:{}}};
 vm.runInNewContext(browserConfig({token,tvAddress:'tv.local',greetingName:'A"; throw Error(1); //',uid:6861,privateKey:'never'}),context);
 assert.equal(context.window.DashboardConfig.greetingName,'A"; throw Error(1); //');
 assert.equal(context.window.DashboardConfig.privateKey,undefined);
 assert.throws(()=>browserConfig({token:'bad'}),/key/);
});
test('release integrity check rejects changed payloads and unsafe paths',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'glass-manifest-'));
 try{
  fs.writeFileSync(path.join(dir,'app.ipk'),'public package');
  const manifest={version:'1.2.0',ipk:'app.ipk',files:{'app.ipk':crypto.createHash('sha256').update('public package').digest('hex')}};
  assert.equal(verifyBundle(dir,manifest),path.join(dir,'app.ipk'));
  fs.writeFileSync(path.join(dir,'app.ipk'),'modified');assert.throws(()=>verifyBundle(dir,manifest),/checksum/);
  assert.throws(()=>verifyBundle(dir,{...manifest,ipk:'../outside',files:{'../outside':'a'}}),/path/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
