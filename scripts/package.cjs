'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const {chooseConfig,browserConfig}=require('./lib/setup.cjs');
const root=path.resolve(__dirname,'..'),isPublic=process.argv.includes('--public');
const out=path.join(root,'dist',isPublic?'public':'private'),stage=path.join(out,'app');
fs.mkdirSync(out,{recursive:true});fs.rmSync(stage,{recursive:true,force:true});
// Local overrides are never copied into a distributable package.
fs.cpSync(path.join(root,'app'),stage,{recursive:true,filter:source=>path.basename(source)!=='config.local.js'});
let override='// Public package. The setup wizard writes private settings on the TV.\n';
if(!isPublic){
 const local=path.join(root,'.local'),file=path.join(local,'private-config.json');fs.mkdirSync(local,{recursive:true,mode:0o700});
 const existing=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
 const addressFile=path.join(local,'tv-address');
 const address=process.env.LG_TV_ADDRESS||(existing&&existing.tvAddress)||(fs.existsSync(addressFile)?fs.readFileSync(addressFile,'utf8').trim():'TV_IP_ADDRESS');
 const config=chooseConfig(existing,null,address);
 fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n',{mode:0o600});override=browserConfig(config);
}
fs.writeFileSync(path.join(stage,'config.local.js'),override,{mode:isPublic?0o644:0o600});
const result=cp.spawnSync('ares-package',['--no-minify',stage,'-o',out],{stdio:'inherit',shell:process.platform==='win32'});
if(result.error)console.error('Maintainer packaging requires the LG webOS CLI. Download the setup ZIP to install without it.');
process.exitCode=result.status===null?1:result.status;
