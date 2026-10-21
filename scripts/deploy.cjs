'use strict';
const cp=require('child_process'),path=require('path'),fs=require('fs');
const {ssh}=require('./ssh.cjs'),{browserConfig,validateConfig}=require('./lib/setup.cjs');
const root=path.resolve(__dirname,'..');process.chdir(root);
const index=process.argv.indexOf('--ipk');
if(index<0)cp.execFileSync(process.execPath,['scripts/package.cjs'],{stdio:'inherit'});
const version=JSON.parse(fs.readFileSync('app/appinfo.json')).version;
const ipk=index<0?'dist/private/com.paulbuttle.glasshome_'+version+'_all.ipk':process.argv[index+1];
if(!ipk||!fs.statSync(ipk).isFile())throw Error('A packaged IPK is required.');
const config=validateConfig(JSON.parse(fs.readFileSync('.local/private-config.json')));
const remote=ssh('if [ -f /media/internal/glass-home/service/config.json ]; then cat /media/internal/glass-home/service/config.json; fi');
if(!remote)throw Error('Run npm run setup for the first installation.');
if(JSON.parse(remote).token!==config.token)throw Error('Installation keys differ. Use the matching setup folder.');
console.log('Installing Glass Home on the TV…');
ssh('umask 077; cat > /tmp/glasshome-update.ipk',fs.readFileSync(ipk));
const output=ssh('sleep 15 | luna-send -i -w 14000 luna://com.webos.appInstallService/dev/install \'{"id":"com.paulbuttle.glasshome","ipkUrl":"/tmp/glasshome-update.ipk","subscribe":true}\'');
const events=output.split('\n').filter(Boolean).map(line=>JSON.parse(line));
if(!events.some(e=>e.statusValue===30&&e.details&&e.details.state==='installed'))throw Error('TV did not confirm installation; integration was not changed.');
// The public IPK has no key. Personalization is written only after installation.
ssh('test -f /media/developer/apps/usr/palm/applications/com.paulbuttle.glasshome/appinfo.json && umask 077 && cat > /media/developer/apps/usr/palm/applications/com.paulbuttle.glasshome/config.local.js.new && chmod 644 /media/developer/apps/usr/palm/applications/com.paulbuttle.glasshome/config.local.js.new && mv /media/developer/apps/usr/palm/applications/com.paulbuttle.glasshome/config.local.js.new /media/developer/apps/usr/palm/applications/com.paulbuttle.glasshome/config.local.js',browserConfig(config));
function upload(dir){
 ssh('mkdir -p /media/internal/glass-home/'+dir.split(path.sep).join('/'));
 for(const name of fs.readdirSync(dir)){
  if(!/^[a-zA-Z0-9.-]+$/.test(name)||name==='config.json')throw Error('Unexpected source file');
  const local=path.join(dir,name);if(fs.statSync(local).isDirectory()){upload(local);continue;}
  const remote='/media/internal/glass-home/'+local.split(path.sep).join('/');
  ssh('cat > '+remote+'.new && chmod '+(name.endsWith('.sh')?'755':'644')+' '+remote+'.new && mv '+remote+'.new '+remote,fs.readFileSync(local));
 }
}
upload('service');upload('integration');
ssh('umask 077; cat > /media/internal/glass-home/service/config.json.new && mv /media/internal/glass-home/service/config.json.new /media/internal/glass-home/service/config.json',JSON.stringify(config));
ssh('for name in photos controller; do p=/tmp/glass-$name.pid; if [ -f "$p" ]; then pid=$(cat "$p"); case "$pid" in *[!0-9]*|"") continue;; esac; case "$(cat /proc/$pid/cmdline 2>/dev/null)" in *glass-home*) kill "$pid";; esac; rm -f "$p"; fi; done; /var/lib/webosbrew/init.d/50-glass-home');
// The native installer can reopen an updated app before personalization is written.
// Close that process so its next launch reads the installed private configuration.
const closed=JSON.parse(ssh('sleep 3 | luna-send -n 1 -w 2500 luna://com.webos.applicationManager/closeByAppId \'{"id":"com.paulbuttle.glasshome"}\''));
if(!closed.returnValue&&!/not running/i.test(closed.errorText||''))throw Error('Could not restart the app after personalization: '+(closed.errorText||'unknown native error'));
// Launch directly even in dashboard-only mode; the Home hook remains disabled.
const launched=ssh('sleep 3 | luna-send -n 1 -w 2500 luna://com.webos.applicationManager/launch \'{"id":"com.paulbuttle.glasshome"}\'');
if(!JSON.parse(launched).returnValue)throw Error('Installation completed, but the dashboard could not be launched.');
ssh('rm -f /tmp/glasshome-update.ipk');
console.log('TV confirmed installation and launch.');
