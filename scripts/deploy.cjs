'use strict';
const cp=require('child_process'),path=require('path'),fs=require('fs'),root=path.resolve(__dirname,'..');
process.chdir(root);
const ssh=(cmd,input)=>cp.execFileSync('scripts/tv-ssh',[cmd],{input,encoding:'utf8',timeout:25000});
cp.execFileSync(process.execPath,['scripts/package.cjs'],{stdio:'inherit'});
const localConfig=JSON.parse(fs.readFileSync('.local/private-config.json'));
const remoteConfig=ssh('if [ -f /media/internal/glass-home/service/config.json ]; then cat /media/internal/glass-home/service/config.json; fi');
if(!remoteConfig)throw Error('Run npm run provision for the first installation.');
if(JSON.parse(remoteConfig).token!==localConfig.token)throw Error('Installation keys differ. Restore the matching .local backup before deploying.');
const version=JSON.parse(fs.readFileSync('app/appinfo.json')).version;
ssh('umask 077; cat > /tmp/glasshome-update.ipk',fs.readFileSync('dist/com.paulbuttle.glasshome_'+version+'_all.ipk'));
const output=ssh('sleep 15 | luna-send -i -w 14000 luna://com.webos.appInstallService/dev/install \'{"id":"com.paulbuttle.glasshome","ipkUrl":"/tmp/glasshome-update.ipk","subscribe":true}\'');
const events=output.split('\n').filter(Boolean).map(line=>JSON.parse(line));
if(!events.some(e=>e.statusValue===30&&e.details&&e.details.state==='installed'))throw Error('TV did not confirm installation; integration was not changed');
function upload(dir){
 ssh('mkdir -p /media/internal/glass-home/'+dir);
 for(const name of fs.readdirSync(dir)){
  if(!/^[a-zA-Z0-9.-]+$/.test(name))throw Error('Unexpected source file');
  const local=path.join(dir,name);if(fs.statSync(local).isDirectory()){upload(local);continue;}
  const remote='/media/internal/glass-home/'+local;
  ssh('cat > '+remote+'.new && chmod '+(name.endsWith('.sh')?'755':'644')+' '+remote+'.new && mv '+remote+'.new '+remote,fs.readFileSync(local));
 }
}
upload('service');upload('integration');
ssh('for name in photos controller; do p=/tmp/glass-$name.pid; if [ -f "$p" ]; then pid=$(cat "$p"); case "$(cat /proc/$pid/cmdline 2>/dev/null)" in *glass-home*) kill "$pid";; esac; rm -f "$p"; fi; done; /var/lib/webosbrew/init.d/50-glass-home');
ssh('/media/internal/glass-home/integration/home.sh');
console.log('TV confirmed installation; services restarted. Verify the TV display and photo service.');
