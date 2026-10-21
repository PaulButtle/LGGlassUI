'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),local=path.join(root,'.local'),out=path.join(root,'dist'),stage=path.join(out,'app'),privateFile=path.join(local,'private-config.json');
fs.mkdirSync(local,{recursive:true,mode:0o700});fs.mkdirSync(out,{recursive:true});
if(!fs.existsSync(privateFile))fs.writeFileSync(privateFile,JSON.stringify({token:crypto.randomBytes(18).toString('hex'),dataDir:'/media/internal/glass-home/photos',port:18765,host:'0.0.0.0'}),{mode:0o600});
const config=JSON.parse(fs.readFileSync(privateFile));
fs.rmSync(stage,{recursive:true,force:true});fs.cpSync(path.join(root,'app'),stage,{recursive:true});
fs.writeFileSync(path.join(stage,'config.local.js'),'window.DashboardConfig.token='+JSON.stringify(config.token)+';\nwindow.DashboardConfig.tvAddress='+JSON.stringify(config.tvAddress||process.env.LG_TV_ADDRESS||'TV_IP_ADDRESS')+';\n',{mode:0o600});
cp.execFileSync('ares-package',['--no-minify',stage,'-o',out],{stdio:'inherit'});
