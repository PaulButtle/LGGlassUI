#!/usr/bin/env node
'use strict';
// No npm dependencies, LG CLI or Git required when run from the release ZIP.
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const {validateConnection,verifyBundle}=require('./scripts/lib/setup.cjs');
const {parseArgs}=require('util');
const root=__dirname;process.chdir(root);
const {values}=parseArgs({options:{host:{type:'string'},port:{type:'string'},key:{type:'string'},name:{type:'string'},integrate:{type:'boolean'},'home-key-code':{type:'string'},check:{type:'boolean'},help:{type:'boolean'}}});
if(values.help){
 console.log('LGGlassUI setup\n\n  node setup.cjs                     Guided install / update\n  node setup.cjs --check             Check the release and SSH prerequisites\n  node setup.cjs --integrate --home-key-code 773\n                                    Enable Home + startup (verified CX code)\n\nOptions: --host TV_IP --port 22 --key /path/to/private_key --name "Alex and Sam"\nRequires Node.js 22+, OpenSSH and an already rooted webOSbrew TV.\nOn first connection, verify the SSH fingerprint against your trusted TV connection.');process.exit(0);
}
(async()=>{
 if(Number(process.versions.node.split('.')[0])<22)throw Error('Install Node.js 22 or newer on this computer.');
 if(values.integrate&&(!/^\d+$/.test(values['home-key-code']||'')||Number(values['home-key-code'])<1||Number(values['home-key-code'])>65535))throw Error('Integration requires --home-key-code with a verified code. The tested CX uses 773. See docs/COMPATIBILITY.md.');
 if(values['home-key-code']&&!values.integrate)throw Error('Use --integrate with --home-key-code.');
 for(const command of ['ssh','ssh-keygen']){const found=cp.spawnSync(command,[command==='ssh'?'-V':'-?'],{stdio:'ignore'});if(found.error)throw Error('Install OpenSSH (ssh and ssh-keygen) first.');}
 let ipk;const manifestFile='release-manifest.json';
 if(fs.existsSync(manifestFile))ipk=verifyBundle(root,JSON.parse(fs.readFileSync(manifestFile)));
 else{console.log('Source checkout: building a public package (requires ares-package).');cp.execFileSync(process.execPath,['scripts/package.cjs','--public'],{stdio:'inherit'});const version=JSON.parse(fs.readFileSync('app/appinfo.json')).version;ipk=path.join(root,'dist/public/com.paulbuttle.glasshome_'+version+'_all.ipk');}
 fs.mkdirSync('.local',{recursive:true,mode:0o700});
 const saved=fs.existsSync('.local/connection.json')?JSON.parse(fs.readFileSync('.local/connection.json')):{};
 const privateConfig=fs.existsSync('.local/private-config.json')?JSON.parse(fs.readFileSync('.local/private-config.json')):{};
 const previousHost=fs.existsSync('.local/tv-address')?fs.readFileSync('.local/tv-address','utf8').trim():'';
 const rl=process.stdin.isTTY?require('readline/promises').createInterface({input:process.stdin,output:process.stdout}):null;
 async function ask(label,current){if(!rl)return current||'';return (await rl.question(label+(current?' ['+current+']':'')+': ')).trim()||current||'';}
 let host,port,key,name=values.name;
 try{
  console.log('\nGlass Home — setup\nYour TV must already have working root SSH and webOSbrew.\n');
  host=values.host||await ask('TV IP address',process.env.LG_TV_ADDRESS||saved.host||previousHost);
  port=values.port||await ask('SSH port',String(saved.port||22));
  key=values.key||await ask('SSH private key path',saved.key||(fs.existsSync('.local/glass-tv-ed25519')?path.join(root,'.local/glass-tv-ed25519'):''));
  if(name===undefined&&rl){const answer=await ask('Greeting names (optional; enter - for none)',privateConfig.greetingName||'');name=answer==='-'?'':answer;}
 }finally{if(rl)rl.close();}
 if(key.startsWith('~/')||key.startsWith('~\\'))key=path.join(os.homedir(),key.slice(2));
 const config=validateConnection({host,port,key});
 if(!fs.statSync(config.key).isFile())throw Error('The SSH private key is not a file.');
 fs.writeFileSync('.local/connection.json',JSON.stringify(config,null,2)+'\n',{mode:0o600});
 fs.writeFileSync('.local/tv-address',config.host+'\n',{mode:0o600});
 process.env.LG_TV_ADDRESS=config.host;
 const {args,ssh}=require('./scripts/ssh.cjs');
 console.log('Connecting to root SSH. If asked, compare the host fingerprint with your trusted TV connection.');
 const trusted=cp.spawnSync('ssh',args(Boolean(process.stdin.isTTY)).concat('test "$(id -u)" = 0'),{cwd:root,stdio:'inherit'});
 if(trusted.status!==0)throw Error('Root SSH could not be verified. Check the address, port, key and trusted host fingerprint.');
 const ready=ssh('test -d /var/lib/webosbrew/init.d && test -x /usr/bin/node && command -v luna-send >/dev/null && echo ready');
 if(ready.trim()!=='ready')throw Error('The TV needs webOSbrew startup hooks, Node and Luna services.');
 if(values.integrate)ssh('test -d /var/lib/eim && test -e /usr/palm/applications/com.webos.app.home/appinfo.json');
 if(values.check){console.log('Release integrity, root SSH and required TV paths passed. No TV files were changed.');return;}
 const options=['scripts/provision.cjs','--ipk',ipk];
 if(values.integrate)options.push('--home-key-code',values['home-key-code']);else options.push('--dashboard-only');
 if(name!==undefined)options.push('--name',name);
 cp.execFileSync(process.execPath,options,{stdio:'inherit'});
 console.log('\nSetup complete. Test the remote, app shortcuts and Frame on your TV.\nPhoto uploads: Settings → Photo collection.\nKeep this folder and your SSH key for updates and recovery.\nRecovery: node scripts/ssh.cjs /media/internal/glass-home/integration/recover.sh');
 if(!values.integrate)console.log('Existing Home/startup settings were preserved. To enable the replacement, see docs/INSTALL.md.');
})().catch(error=>{console.error('\nSetup stopped: '+error.message);process.exitCode=1;});
