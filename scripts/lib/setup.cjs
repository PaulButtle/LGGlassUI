'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function validateConnection(value){
 const host=String(value.host||'').trim(),port=Number(value.port||22),key=String(value.key||'');
 if(!/^[a-zA-Z0-9][a-zA-Z0-9.:-]*$/.test(host))throw Error('Enter a TV IP address or hostname, without spaces or SSH options.');
 if(!Number.isInteger(port)||port<1||port>65535||value.port===0)throw Error('SSH port must be between 1 and 65535.');
 if(!key||/[\r\n\0]/.test(key))throw Error('Choose an existing SSH private key.');
 return {host,port,key:path.resolve(key)};
}
function validateConfig(config){
 if(!config||typeof config.token!=='string'||!/^[a-f0-9]{36}$/.test(config.token))throw Error('Invalid installation key. Restore a matching private backup.');
 if(config.greetingName!==undefined&&(typeof config.greetingName!=='string'||config.greetingName.length>80||/[\x00-\x1f\x7f]/.test(config.greetingName)))throw Error('Greeting names must be at most 80 characters, on one line.');
 return config;
}
function chooseConfig(local,remote,address,name){
 if(local)validateConfig(local);if(remote)validateConfig(remote);
 if(local&&remote&&local.token!==remote.token)throw Error('This TV has a different installation key. Use its matching setup folder.');
 if(local&&!remote&&local.tvAddress&&local.tvAddress!==address)throw Error('This setup folder belongs to a different TV. Use a separate extracted folder.');
 const config=Object.assign({},remote||local||{token:crypto.randomBytes(18).toString('hex')});
 config.tvAddress=address;config.dataDir='/media/internal/glass-home/photos';config.port=18765;config.host='0.0.0.0';config.uid=6861;
 if(name!==undefined)config.greetingName=name.trim();
 else if(local&&local.greetingName!==undefined)config.greetingName=local.greetingName;
 return validateConfig(config);
}
function browserConfig(config){
 validateConfig(config);
 const address=config.tvAddress||'TV_IP_ADDRESS';
 const values={token:config.token,tvAddress:address.includes(':')?'['+address+']':address,greetingName:config.greetingName||''};
 return Object.entries(values).map(([key,value])=>'window.DashboardConfig.'+key+'='+JSON.stringify(value).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';').join('\n')+'\n';
}
function verifyBundle(root,manifest){
 if(!manifest||!manifest.files||!manifest.files[manifest.ipk])throw Error('Release manifest is missing its package.');
 for(const [name,hash]of Object.entries(manifest.files)){
  if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.startsWith('/')||name.split('/').some(p=>p==='..'||p===''))throw Error('Unsafe release path.');
  const file=path.join(root,name);
  if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)throw Error('Release checksum mismatch: '+name+'. Extract a fresh download.');
 }
 return path.join(root,manifest.ipk);
}
module.exports={validateConnection,validateConfig,chooseConfig,browserConfig,verifyBundle};
