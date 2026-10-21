'use strict';
// Maintainer-only build. Distribution uses an explicit allowlist, never .local/dist.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),vm=require('vm');
const root=path.resolve(__dirname,'..');process.chdir(root);
const version=JSON.parse(fs.readFileSync('package.json')).version;
if(JSON.parse(fs.readFileSync('app/appinfo.json')).version!==version)throw Error('Package and TV versions differ.');
cp.execFileSync(process.execPath,['scripts/package.cjs','--public'],{stdio:'inherit'});
const context={window:{}};vm.runInNewContext(fs.readFileSync('dist/public/app/config.js','utf8')+fs.readFileSync('dist/public/app/config.local.js','utf8'),context);
if(context.window.DashboardConfig.token||context.window.DashboardConfig.greetingName||context.window.DashboardConfig.tvAddress!=='TV_IP_ADDRESS')throw Error('Public configuration contains installation-specific settings.');
const out=path.join(root,'dist/release'),folder='LGGlassUI-v'+version,bundle=path.join(out,folder);
fs.mkdirSync(out,{recursive:true});fs.rmSync(bundle,{recursive:true,force:true});fs.mkdirSync(bundle);
const forbidden=[];
if(fs.existsSync('.local/private-config.json')){const p=JSON.parse(fs.readFileSync('.local/private-config.json'));for(const key of ['token','greetingName','tvAddress'])if(p[key]&&p[key]!=='TV_IP_ADDRESS')forbidden.push(p[key]);}
function copy(source,destination){
 const stat=fs.lstatSync(source);if(stat.isSymbolicLink())throw Error('Do not include symlinks in releases: '+source);
 if(stat.isDirectory()){fs.mkdirSync(destination,{recursive:true});for(const name of fs.readdirSync(source)){
  if(name==='config.local.js')continue;
  if(name.startsWith('.')||name==='config.json'||name.endsWith('.log'))throw Error('Unexpected release file: '+path.join(source,name));
  copy(path.join(source,name),path.join(destination,name));
 }return;}
 const bytes=fs.readFileSync(source);
 if(forbidden.some(value=>bytes.includes(Buffer.from(value)))||/-----BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY-----/.test(bytes.toString()))throw Error('Private data found in release source: '+source);
 fs.copyFileSync(source,destination);
}
for(const dir of ['app','service','integration','scripts','tests'])copy(dir,path.join(bundle,dir));
fs.mkdirSync(path.join(bundle,'docs/assets'),{recursive:true});
for(const name of ['INSTALL.md','RECOVERY.md','ARCHITECTURE.md','COMPATIBILITY.md','RELEASING.md','assets/dashboard.png'])copy('docs/'+name,path.join(bundle,'docs',name));
for(const name of ['README.md','LICENSE','CHANGELOG.md','package.json','setup.cjs'])copy(name,path.join(bundle,name));
const ipk='com.paulbuttle.glasshome_'+version+'_all.ipk';
fs.mkdirSync(path.join(bundle,'prebuilt'));copy('dist/public/'+ipk,path.join(bundle,'prebuilt',ipk));
const files={};
function hashTree(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name);if(fs.statSync(file).isDirectory())hashTree(file);else files[path.relative(bundle,file).split(path.sep).join('/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}
hashTree(bundle);
fs.writeFileSync(path.join(bundle,'release-manifest.json'),JSON.stringify({version,ipk:'prebuilt/'+ipk,files},null,2)+'\n');
const zip='LGGlassUI-v'+version+'-setup.zip';fs.rmSync(path.join(out,zip),{force:true});
cp.execFileSync('zip',['-qr',zip,folder],{cwd:out});fs.copyFileSync('dist/public/'+ipk,path.join(out,ipk));
const sums=[zip,ipk].map(name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')+'  '+name).join('\n')+'\n';
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),sums);
console.log('Release built: '+path.relative(root,out)+'\n'+zip+'\n'+ipk+'\nSHA256SUMS.txt');
