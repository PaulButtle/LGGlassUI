'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const {validateConnection}=require('./lib/setup.cjs');
const root=path.resolve(__dirname,'..');
function connection(){
 const file=path.join(root,'.local/connection.json');
 const saved=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};
 const addressFile=path.join(root,'.local/tv-address');
 return validateConnection({host:process.env.LG_TV_ADDRESS||saved.host||(fs.existsSync(addressFile)?fs.readFileSync(addressFile,'utf8').trim():''),port:saved.port||22,key:saved.key||path.join(root,'.local/glass-tv-ed25519')});
}
function args(trust=false){
 const c=connection();
 return ['-i',c.key,'-p',String(c.port),'-o','ConnectTimeout=8','-o','ConnectionAttempts=1','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking='+(trust?'ask':'yes'),'-o','UserKnownHostsFile=.local/tv-known-hosts','root@'+c.host];
}
function ssh(command,input){
 try{return cp.execFileSync('ssh',args().concat(command),{cwd:root,input,encoding:'utf8',timeout:30000,stdio:['pipe','pipe','pipe']});}
 catch(error){throw Error('TV command failed: '+(error.stderr?String(error.stderr).trim():error.message));}
}
if(require.main===module){const result=cp.spawnSync('ssh',args().concat(process.argv.slice(2)),{cwd:root,stdio:'inherit'});if(result.error)console.error(result.error.message);process.exitCode=result.status===null?1:result.status;}
module.exports={ssh,args,connection};
