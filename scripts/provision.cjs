'use strict';
// Provision an already rooted, SSH-accessible TV. Does not exploit/root devices.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
process.chdir(path.resolve(__dirname,'..'));
const index=process.argv.indexOf('--home-key-code'),homeCode=Number(process.argv[index+1]);
if(index<0||!Number.isInteger(homeCode)||homeCode<1||homeCode>65535)throw Error('Supply --home-key-code with the code verified for your TV (773 on the tested CX).');
const ssh=(command,input)=>cp.execFileSync('scripts/tv-ssh',[command],{input,encoding:'utf8',timeout:25000});
const source='https://raw.githubusercontent.com/Simon34545/lginputhook/a607900118e088208f83f0f0c7a5a5b922092594/service/inputhook/';
const binaries={'ezinject':'d2def5b3f68a415cf5a4a747ab70115e70a82f721bafbcc0d9c5a7bd5c161160','libinputhookpp.so':'de2c155a598827e7b31b2fa2cfe80e1cc7ad9347ccdd16f1c2aeb9bc0db1b49d'};
(async()=>{
 if(ssh('id -u').trim()!=='0')throw Error('Provisioning requires an existing root SSH connection.');
 if(ssh('test -d /var/lib/webosbrew && test -x /usr/bin/node && test -d /var/lib/eim && echo ready').trim()!=='ready')throw Error('Required webOSbrew, Node and native input storage are unavailable.');
 const local='.local/private-config.json';fs.mkdirSync('.local',{recursive:true,mode:0o700});
 if(!fs.existsSync(local))fs.writeFileSync(local,JSON.stringify({token:crypto.randomBytes(18).toString('hex'),dataDir:'/media/internal/glass-home/photos',port:18765,host:'0.0.0.0',uid:6861}),{mode:0o600});
 const config=JSON.parse(fs.readFileSync(local));config.uid=6861;
 if(typeof config.token!=='string'||!/^[a-f0-9]{36}$/.test(config.token))throw Error('Expected the generated installation token.');
 const installed=ssh('if [ -f /media/internal/glass-home/service/config.json ]; then cat /media/internal/glass-home/service/config.json; fi');
 if(installed&&JSON.parse(installed).token!==config.token)throw Error('TV has a different installation key. Restore its matching .local backup before provisioning.');
 const native={};
 for(const [name,hash]of Object.entries(binaries)){
  const cached='.local/tools/lginputhook/'+name;let bytes;
  if(fs.existsSync(cached))bytes=fs.readFileSync(cached);else{const response=await fetch(source+name);if(!response.ok)throw Error('Native binary download failed');bytes=Buffer.from(await response.arrayBuffer());}
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Native binary checksum mismatch: '+name);native[name]=bytes;
 }
 ssh('mkdir -p /media/internal/glass-home/service /media/internal/glass-home/inputhook /media/internal/glass-home/photos /var/lib/glass-home /var/lib/webosbrew/init.d /home/root/.config/lginputhook; chmod 700 /media/internal/glass-home/photos; chown 6861:6861 /media/internal/glass-home/photos');
 ssh('umask 077; cat > /media/internal/glass-home/service/config.json',JSON.stringify(config));
 for(const [name,bytes]of Object.entries(native))ssh('cat > /media/internal/glass-home/inputhook/'+name+' && chmod 755 /media/internal/glass-home/inputhook/'+name,bytes);
 // Preserve unrelated key bindings and retain the original configuration once.
 const bindingScript="var fs=require('fs'),p='/home/root/.config/lginputhook/keybinds.json',b='/var/lib/glass-home/keybinds.before',raw=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'{}';var keys=JSON.parse(raw);if(!fs.existsSync(b))fs.writeFileSync(b,raw);keys["+homeCode+"]={action:'exec',command:'/media/internal/glass-home/integration/home.sh'};fs.writeFileSync(p,JSON.stringify(keys));";
 // Deploy with replacement disabled until the app, services and recovery exist.
 ssh('touch /var/lib/glass-home/disabled');
 const boot='#!/bin/sh\nnohup /media/internal/glass-home/integration/start.sh </dev/null >/tmp/glass-startup.log 2>&1 &\n';
 ssh('cat > /var/lib/webosbrew/init.d/50-glass-home && chmod 755 /var/lib/webosbrew/init.d/50-glass-home',boot);
 cp.execFileSync(process.execPath,['scripts/deploy.cjs'],{stdio:'inherit'});
 ssh('/usr/bin/node /media/internal/glass-home/integration/configure-startup.js enable');
 ssh('/usr/bin/node',bindingScript);
 ssh('rm -f /var/lib/glass-home/disabled; /var/lib/webosbrew/init.d/50-glass-home');
 ssh('/media/internal/glass-home/integration/home.sh');
 console.log('Provisioned. Verify Home, normal app/input switching, standby, cold startup and recovery on the TV.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
