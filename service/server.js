'use strict';
// Node 8 compatible. This service has no shell-execution or general filesystem API.
var http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url'),os=require('os');
var decodeJpeg=require('./vendor/jpeg-decoder');
var ID=/^[a-f0-9]{24}$/;
function jpegSize(b){
  if(b.length<25||b[0]!==255||b[1]!==216||b[b.length-2]!==255||b[b.length-1]!==217)throw Error('Choose a valid JPEG image.');
  var i=2,size=null,sawScan=false;
  while(i<b.length-2){
    if(b[i++]!==255)throw Error('Invalid JPEG structure.');
    while(b[i]===255)i++;
    var marker=b[i++];
    if(marker===216||marker===217||marker===0)throw Error('Invalid JPEG marker.');
    if(i+2>b.length)throw Error('Truncated JPEG.');
    var length=b.readUInt16BE(i);
    if(length<2||i+length>b.length-2)throw Error('Truncated JPEG.');
    if(marker===218){if(length<6||length!==6+2*b[i+2])throw Error('Invalid JPEG scan.');sawScan=true;break;}
    if([192,193,194].indexOf(marker)>=0){if(length<8)throw Error('Invalid JPEG dimensions.');size={height:b.readUInt16BE(i+3),width:b.readUInt16BE(i+5)};}
    i+=length;
  }
  if(!size||!sawScan||!size.width||!size.height||size.width>3840||size.height>2160)throw Error('Images must be at most 3840 × 2160.');
  try{var decoded=decodeJpeg(b,{tolerantDecoding:false,maxResolutionInMP:9,maxMemoryUsageInMB:64,useTArray:true,formatAsRGBA:false});if(decoded.width!==size.width||decoded.height!==size.height)throw Error();}catch(e){throw Error('This JPEG cannot be decoded safely. Add it through the photo uploader to resize and convert it.');}
  return size;
}
function createServer(options){
  var dir=options.dataDir,token=options.token,maxBytes=options.maxBytes||8*1024*1024,maxPhotos=options.maxPhotos||100,maxTotal=options.maxTotal||256*1024*1024;
  if(!token||token.length<24)throw Error('A private token of at least 24 characters is required.');
  if(!fs.existsSync(dir))fs.mkdirSync(dir,0o700);
  var indexFile=path.join(dir,'photos.json'),state={photos:[]};
  if(fs.existsSync(indexFile)){state=JSON.parse(fs.readFileSync(indexFile,'utf8'));if(!state||!Array.isArray(state.photos)||state.photos.some(function(p){return !p||!ID.test(p.id)||!Number.isFinite(p.bytes);}))throw Error('Photo index is invalid; restore its backup before starting.');}
  state.photos=state.photos.filter(function(p){return fs.existsSync(path.join(dir,p.id+'.jpg'));});
  function commit(next){var tmp=indexFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next),{mode:0o600});fs.renameSync(tmp,indexFile);state=next;}
  function secureEqual(a,b){var x=Buffer.from(a||''),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
  function respond(res,code,data){res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
  var inFlight=0;
  function body(req,res,limit,callback){
    if(inFlight>=2){res.setHeader('Connection','close');respond(res,429,{error:'Two uploads are already in progress. Please try again.'});req.resume();return;}
    inFlight++;
    var length=0,chunks=[],finished=false;
    var deadline=setTimeout(function(){finish();req.destroy();},15000);
    function finish(){if(finished)return;finished=true;clearTimeout(deadline);inFlight--;chunks=[];}
    req.on('data',function(b){if(finished)return;length+=b.length;if(length>limit){finish();res.setHeader('Connection','close');respond(res,413,{error:'This image is too large.'});return;}chunks.push(b);});
    req.on('end',function(){if(finished)return;var bytes=Buffer.concat(chunks);finish();callback(bytes);});
    req.on('error',finish);req.on('aborted',finish);res.on('close',finish);
  }
  var server=http.createServer(function(req,res){
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY');
    var parsed;try{parsed=new url.URL(req.url,'http://localhost');}catch(e){respond(res,400,{error:'Invalid address.'});return;}var pathname=parsed.pathname;
    var origin=req.headers.origin,localOrigin=origin==='null'&&(req.socket.remoteAddress==='127.0.0.1'||req.socket.remoteAddress==='::1'||req.socket.remoteAddress==='::ffff:127.0.0.1');
    var sameOrigin=origin==='http://'+req.headers.host;
    if(origin&&!sameOrigin&&!localOrigin){respond(res,403,{error:'This origin is not allowed.'});return;}
    if(localOrigin){res.setHeader('Access-Control-Allow-Origin','null');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');}
    if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
    if(pathname==='/'&&req.method==='GET'){res.setHeader('Content-Type','text/html; charset=utf-8');fs.createReadStream(path.join(__dirname,'manager.html')).on('error',function(){if(!res.headersSent)res.statusCode=503;res.end('Photo manager unavailable.');}).pipe(res);return;}
    var supplied=(req.headers.authorization||'').replace(/^Bearer /,'');
    if(pathname.indexOf('/photos/')===0&&req.method==='GET')supplied=supplied||parsed.searchParams.get('token');
    if(!secureEqual(typeof supplied==='string'?supplied:'',token)){respond(res,401,{error:'Enter the access key shown on your TV.'});return;}
    try{
      if(pathname==='/api/photos'&&req.method==='GET'){respond(res,200,{photos:state.photos,maxPhotos:maxPhotos,maxTotal:maxTotal});return;}
      if(pathname==='/api/network'&&req.method==='GET'){var addresses=[];var ifaces=os.networkInterfaces();Object.keys(ifaces).forEach(function(k){ifaces[k].forEach(function(n){if(n.family==='IPv4'&&!n.internal)addresses.push(n.address);});});respond(res,200,{addresses:addresses,port:server.address().port});return;}
      if(pathname==='/api/photos'&&req.method==='POST'){
        if(req.headers['content-type']!=='image/jpeg'){respond(res,415,{error:'Upload JPEG images through the photo manager.'});return;}
        body(req,res,maxBytes,function(b){try{
          var size=jpegSize(b),used=state.photos.reduce(function(n,p){return n+p.bytes;},0);
          if(state.photos.length>=maxPhotos||used+b.length>maxTotal){respond(res,409,{error:'Your collection is full. Remove a photo first.'});return;}
          var id=crypto.randomBytes(12).toString('hex'),file=path.join(dir,id+'.jpg'),photo={id:id,bytes:b.length,width:size.width,height:size.height,added:new Date().toISOString()};
          fs.writeFileSync(file,b,{flag:'wx',mode:0o600});
          try{commit({photos:state.photos.concat([photo])});}catch(e){fs.unlinkSync(file);throw e;}
          respond(res,201,photo);
        }catch(e){respond(res,e.code==='ENOSPC'?507:400,{error:e.code==='ENOSPC'?'TV storage is full.':e.code?'Could not save this photo.':e.message});}});return;
      }
      if(pathname==='/api/order'&&req.method==='POST'){
        body(req,res,10000,function(b){try{var ids=JSON.parse(b.toString()).ids;
          if(!Array.isArray(ids)||ids.length!==state.photos.length||new Set(ids).size!==ids.length||ids.some(function(id){return !state.photos.some(function(p){return p.id===id;});})){respond(res,409,{error:'The collection changed. Refresh and try again.'});return;}
          commit({photos:ids.map(function(id){return state.photos.filter(function(p){return p.id===id;})[0];})});respond(res,200,{ok:true});
        }catch(e){respond(res,400,{error:'Could not save the order.'});}});return;
      }
      var match=pathname.match(/^\/(api\/photos|photos)\/([a-f0-9]{24})$/);
      if(match){var id=match[2],photo=state.photos.filter(function(p){return p.id===id;})[0];
        if(!photo){respond(res,404,{error:'Photo not found.'});return;}
        var file=path.join(dir,id+'.jpg');
        if(match[1]==='api/photos'&&req.method==='DELETE'){commit({photos:state.photos.filter(function(p){return p.id!==id;})});try{fs.unlinkSync(file);}catch(e){}respond(res,200,{ok:true});return;}
        if(match[1]==='photos'&&req.method==='GET'){res.setHeader('Content-Type','image/jpeg');fs.createReadStream(file).on('error',function(){if(!res.headersSent)res.statusCode=404;res.end();}).pipe(res);return;}
      }
      respond(res,404,{error:'Not found.'});
    }catch(e){respond(res,500,{error:'Photo service could not complete this request.'});}
  });
  server.maxConnections=12;server.setTimeout(30000);return server;
}
module.exports={createServer:createServer,jpegSize:jpegSize};
if(require.main===module){var config=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'config.json'),'utf8'));if(config.uid!==undefined){process.setgroups([]);process.setgid(config.uid);process.setuid(config.uid);}var s=createServer(config);s.listen(config.port||18765,config.host||'0.0.0.0',function(){console.log('Glass Home photo service ready');});}
