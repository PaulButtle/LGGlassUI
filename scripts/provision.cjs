'use strict';
// For an already rooted TV; never changes the root/SSH installation.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const {parseArgs}=require('util'),{ssh,connection}=require('./ssh.cjs'),{chooseConfig}=require('./lib/setup.cjs');
process.chdir(path.resolve(__dirname,'..'));
const {values}=parseArgs({options:{'home-key-code':{type:'string'},'dashboard-only':{type:'boolean'},ipk:{type:'string'},name:{type:'string'}}});
const full=!values['dashboard-only'],homeCode=Number(values['home-key-code']);
const source='https://raw.githubusercontent.com/Simon34545/lginputhook/a607900118e088208f83f0f0c7a5a5b922092594/service/inputhook/';
const hashes={ezinject:'d2def5b3f68a415cf5a4a747ab70115e70a82f721bafbcc0d9c5a7bd5c161160','libinputhookpp.so':'de2c155a598827e7b31b2fa2cfe80e1cc7ad9347ccdd16f1c2aeb9bc0db1b49d'};
let integrationChanged=false;
(async()=>{
 if(full&&(!Number.isInteger(homeCode)||homeCode<1||homeCode>65535))throw Error('Supply --home-key-code with your verified remote code, or --dashboard-only.');
 if(ssh('id -u').trim()!=='0')throw Error('Root SSH is required.');
 ssh('test -d /var/lib/webosbrew/init.d && test -x /usr/bin/node');
 if(full)ssh('test -d /var/lib/eim && test -f /usr/palm/applications/com.webos.app.home/appinfo.json && { pidof lginput2 || pidof micomservice; } >/dev/null');
 const local='.local/private-config.json';fs.mkdirSync('.local',{recursive:true,mode:0o700});
 const installed=ssh('if [ -f /media/internal/glass-home/service/config.json ]; then cat /media/internal/glass-home/service/config.json; fi');
 if(!installed&&ssh("awk -F: '$3 == 6861 {print $1}' /etc/passwd").trim())throw Error('Photo service UID 6861 is already assigned on this TV.');
 const config=chooseConfig(fs.existsSync(local)?JSON.parse(fs.readFileSync(local)):null,installed?JSON.parse(installed):null,connection().host,values.name);
 const native={};
 if(full){
  console.log('Checking native Home integration components…');
  for(const [name,hash]of Object.entries(hashes)){
   const cached='.local/tools/lginputhook/'+name;let bytes;
   if(fs.existsSync(cached))bytes=fs.readFileSync(cached);else{const response=await fetch(source+name,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Native component download failed');bytes=Buffer.from(await response.arrayBuffer());}
   if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Native component checksum mismatch: '+name);native[name]=bytes;
  }
 }
 fs.writeFileSync(local,JSON.stringify(config,null,2)+'\n',{mode:0o600});fs.chmodSync(local,0o600);
 ssh('mkdir -p /media/internal/glass-home/service /media/internal/glass-home/photos /var/lib/glass-home; chmod 700 /media/internal/glass-home/photos; chown 6861:6861 /media/internal/glass-home/photos');
 if(!installed)ssh('touch /var/lib/glass-home/disabled');
 // A failed update retains the existing service configuration until deploy succeeds.
 if(!installed)ssh('umask 077; cat > /media/internal/glass-home/service/config.json',JSON.stringify(config));
 const boot='#!/bin/sh\nnohup /media/internal/glass-home/integration/start.sh </dev/null >/tmp/glass-startup.log 2>&1 &\n';
 ssh('cat > /var/lib/webosbrew/init.d/50-glass-home.new && chmod 755 /var/lib/webosbrew/init.d/50-glass-home.new && mv /var/lib/webosbrew/init.d/50-glass-home.new /var/lib/webosbrew/init.d/50-glass-home',boot);
 const deploy=['scripts/deploy.cjs'];if(values.ipk)deploy.push('--ipk',values.ipk);
 cp.execFileSync(process.execPath,deploy,{stdio:'inherit'});
 if(full){
  integrationChanged=true;ssh('touch /var/lib/glass-home/disabled; mkdir -p /media/internal/glass-home/inputhook /home/root/.config/lginputhook');
  for(const [name,bytes]of Object.entries(native))ssh('cat > /media/internal/glass-home/inputhook/'+name+'.new && chmod 755 /media/internal/glass-home/inputhook/'+name+'.new && mv /media/internal/glass-home/inputhook/'+name+'.new /media/internal/glass-home/inputhook/'+name,bytes);
  const binding="var fs=require('fs'),p='/home/root/.config/lginputhook/keybinds.json',b='/var/lib/glass-home/keybinds.before',raw=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'{}';var keys=JSON.parse(raw);if(!fs.existsSync(b))fs.writeFileSync(b,raw);keys["+homeCode+"]={action:'exec',command:'/media/internal/glass-home/integration/home.sh'};fs.writeFileSync(p,JSON.stringify(keys));";
  ssh('/usr/bin/node /media/internal/glass-home/integration/configure-startup.js enable');
  ssh('/usr/bin/node',binding);
  ssh('rm -f /var/lib/glass-home/disabled; /var/lib/webosbrew/init.d/50-glass-home');
  ssh('/media/internal/glass-home/integration/home.sh');
  console.log('Home and native startup enabled. Original LG Home and recovery backups retained.');
 }
 // Check the authenticated API without putting the key in a process argument or log.
 const health="var http=require('http'),fs=require('fs'),c=JSON.parse(fs.readFileSync('/media/internal/glass-home/service/config.json'));var r=http.get({host:'127.0.0.1',port:c.port,path:'/api/photos',headers:{Authorization:'Bearer '+c.token}},function(s){s.resume();s.on('end',function(){if(s.statusCode!==200)process.exit(1);console.log('Photo service is ready.');});});r.setTimeout(5000,function(){r.abort();});r.on('error',function(){process.exit(1);});";
 let healthy=false;for(let n=0;n<6;n++){try{console.log(ssh('/usr/bin/node',health).trim());healthy=true;break;}catch(error){if(n===5)throw error;await new Promise(resolve=>setTimeout(resolve,500));}}
 if(!healthy)throw Error('Photo service did not become ready.');
})().catch(error=>{
 console.error(error.message);
 if(integrationChanged){try{ssh('/media/internal/glass-home/integration/recover.sh');console.error('Home/startup integration was disabled and original recovery requested.');}catch(recovery){console.error('Run recovery from docs/RECOVERY.md: '+recovery.message);}}
 process.exitCode=1;
});
