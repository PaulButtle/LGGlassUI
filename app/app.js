(function(){'use strict';
 var config=window.DashboardConfig,core=window.DashboardCore,platform=window.DashboardPlatform;
 var $=function(id){return document.getElementById(id);},apps=$('apps'),lastFocus=null,photos=[],photoIndex=-1,failed={},frameActive=false,paused=false,slideTimer=null,endTimer=null,helpTimer=null,toastTimer=null,idleTimer=null;
 var screensaverMode='lg',screensaverBusy=false;
 var prefs=core.preferences(read('glass.preferences')),selected=core.savedFocus(read('glass.focus'),config.apps.length),base='http://127.0.0.1:'+config.port;
 function read(k){try{return localStorage.getItem(k);}catch(e){return null;}}
 function save(k,v){try{localStorage.setItem(k,v);}catch(e){}}
 function api(route,options){options=options||{};options.headers=Object.assign({},options.headers,{'Authorization':'Bearer '+config.token});return new Promise(function(resolve,reject){var settled=false;var t=setTimeout(function(){settled=true;reject(Error('The photo library is not responding.'));},5000);fetch(base+route,options).then(function(r){return r.json().then(function(j){if(!r.ok)throw Error(j.error||'Photo library unavailable.');return j;});}).then(function(j){clearTimeout(t);if(!settled)resolve(j);},function(e){clearTimeout(t);if(!settled)reject(e);});});}
 var logos={
  plex:'ple<svg viewBox="0 0 20 32" aria-hidden="true"><path d="M1 0h9l10 16-10 16H1l10-16z" fill="#e6b451"/></svg>',
  youtube:'<svg viewBox="0 0 72 48" aria-hidden="true"><rect x="1" y="3" width="70" height="42" rx="12" fill="#f84845"/><path d="M29 13l20 11-20 11z" fill="#fff"/></svg>',
  netflix:'N',
  iplayer:'<span class="bbc-boxes"><span>B</span><span>B</span><span>C</span></span>iPLAYER',
  prime:'prime video<svg viewBox="0 0 100 24" aria-hidden="true"><path d="M4 5Q45 30 91 3M80 3L94 1 92 13" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>',
  disney:'Disney<span>+</span>',
  apple:'<svg viewBox="0 0 24 28" aria-hidden="true"><path fill="currentColor" d="M17.9 0c.2 2.4-1.4 5-3.8 5.6-.6-2.1 1.3-5.2 3.8-5.6zM20.7 14.8c0 4 3.3 5.3 3.3 5.3s-2.4 7.3-6 7.3c-1.7 0-2.3-1.1-4.7-1.1s-3.2 1.2-4.7 1.2C5 27.5 0 19.4 0 13.7 0 8 4 6 6.7 6c2 0 3.4 1.3 5.4 1.3S16 6 18 6c2.3 0 4.3 1 5.7 2.6-3 1.7-3 4.1-3 6.2z"/></svg>tv',
  itv:'itv',
  spotify:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#65ce92"/><g fill="none" stroke="#163628" stroke-linecap="round"><path d="M15 24q19-8 37 3" stroke-width="5"/><path d="M18 34q16-6 31 3" stroke-width="4"/><path d="M21 43q12-4 24 2" stroke-width="3.5"/></g></svg>'
 };
 config.apps.forEach(function(app,i){var button=document.createElement('button');button.className='app-tile';button.setAttribute('aria-label','Open '+app.name);button.setAttribute('data-app',app.id);button.innerHTML='<span class="brand '+app.brand+'">'+logos[app.brand]+'</span><span class="tile-label"></span>';button.querySelector('.tile-label').textContent=app.name;button.addEventListener('focus',function(){selected=i;save('glass.focus',String(i));});button.addEventListener('click',function(){launch(app.id,app.name);});apps.appendChild(button);});
 function focusApp(){apps.children[selected].focus();}
 function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(function(){$('toast').classList.add('hidden');},5000);}
 function launch(id,name){toast('Opening '+name+'…');platform.launch(id).then(function(){$('toast').classList.add('hidden');},function(e){toast(e.message);});}
 function clock(){var d=new Date(),hour=d.getHours();$('clock').textContent=('0'+hour).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);$('clock').setAttribute('datetime',d.toISOString());$('greeting').textContent=core.greeting(hour,config.greetingName);$('date').textContent=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});}
 function openModal(title,html){lastFocus=document.activeElement;$('modal-title').textContent=title;$('modal-content').innerHTML=html;$('modal').classList.remove('hidden');var first=$('modal-content').querySelector('button');(first||$('modal-close')).focus();}
 function closeModal(){$('modal').classList.add('hidden');if(lastFocus&&document.contains(lastFocus))lastFocus.focus();else focusApp();}
 function action(id,label,primary){return '<button class="action'+(primary?' primary':'')+'" id="'+id+'">'+label+'</button>';}
 function settings(){openModal('Make it yours','<div class="modal-actions">'+action('tv-settings','TV settings',true)+action('photo-settings','Photo collection')+action('original-home','Open LG Home')+'</div><p>Frame preferences</p><div class="settings-row"><span>Change image</span>'+action('interval','')+'</div><div class="settings-row"><span>Image fit</span>'+action('fit','')+'</div><div class="settings-row"><span>Frame brightness</span>'+action('dim','')+'</div><div class="settings-row"><span>End Frame after</span>'+action('duration','')+'</div><div class="settings-row"><span>Screensaver</span>'+action('screensaver','Loading…')+'</div><p id="screensaver-note" class="fine-print">Checking your TV’s screensaver…</p><p class="fine-print">Your TV’s screen protection stays active. Manual Frame sessions finish after the selected time.</p>');
  $('tv-settings').onclick=function(){launch('com.palm.app.settings','TV settings');};$('photo-settings').onclick=manage;$('original-home').onclick=function(){launch(config.originalHome,'LG Home');};
  function labels(){$('interval').textContent=prefs.interval<60?prefs.interval+' seconds':prefs.interval/60+' minute'+(prefs.interval>60?'s':'');$('fit').textContent=prefs.fit==='cover'?'Fill screen':'Fit image';$('dim').textContent=prefs.dim===.55?'Low':prefs.dim===.78?'Soft':'Original';$('duration').textContent=prefs.duration+' minutes';}
  [['interval',[30,60,120,300]],['fit',['contain','cover']],['dim',[.55,.78,1]],['duration',[15,30,60]]].forEach(function(item){$(item[0]).onclick=function(){prefs[item[0]]=item[1][(item[1].indexOf(prefs[item[0]])+1)%item[1].length];save('glass.preferences',JSON.stringify(prefs));labels();if(screensaverMode==='frame')setScreensaver('frame');};});labels();
  $('screensaver').onclick=function(){setScreensaver(screensaverMode==='frame'?'lg':'frame');};loadScreensaver();
 }
 function showScreensaver(value){screensaverMode=value.settings.mode;if(!$('screensaver'))return;$('screensaver').textContent=screensaverMode==='frame'?'Frame Photographs':'LG Fireworks';$('screensaver').disabled=screensaverBusy||(!value.status.available&&screensaverMode!=='frame');$('screensaver-note').textContent=value.status.error||(value.status.applied!==screensaverMode?'Applying your choice…':screensaverMode==='frame'?'Your Frame photographs appear when LG starts its screensaver. Images are softly dimmed and gently move. Use the remote to return.':'LG’s original screensaver is selected. Choose Frame Photographs to use your collection instead.');}
 function loadScreensaver(){api('/api/screensaver').then(showScreensaver).catch(function(){if($('screensaver')){$('screensaver').textContent='LG Fireworks';$('screensaver').disabled=true;$('screensaver-note').textContent='Screensaver choices are available after setup on a supported TV.';}});}
 function setScreensaver(mode){
  if(screensaverBusy)return;screensaverBusy=true;if($('screensaver'))$('screensaver').disabled=true;
  api('/api/screensaver',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:mode,interval:prefs.interval,fit:prefs.fit,dim:prefs.dim})}).then(function(value){
   showScreensaver(value);var attempts=0;
   function check(){api('/api/screensaver').then(function(current){showScreensaver(current);if(current.status.applied===mode||current.status.error||++attempts>=12){screensaverBusy=false;showScreensaver(current);if(current.status.error)toast(current.status.error);}else setTimeout(check,500);}).catch(failed);}
   check();
  }).catch(failed);
  function failed(error){screensaverBusy=false;toast(error.message);loadScreensaver();}
 }
 function manage(){openModal('Your photo collection','<p>Add your favourite photographs from a phone or computer on the same Wi-Fi.</p><div class="access-box"><small>OPEN THIS ADDRESS</small><code id="upload-address"></code><small>ACCESS KEY</small><code id="upload-key"></code></div><p class="fine-print">Photos are stored on this TV. Keep the access key private.</p><div class="modal-actions">'+action('collection-done','Done',true)+'</div>');$('upload-address').textContent='http://'+config.tvAddress+':'+config.port;$('upload-key').textContent=config.token||'Available after TV installation';$('collection-done').onclick=closeModal;api('/api/network').then(function(r){if($('upload-address')&&r.addresses.length)$('upload-address').textContent='http://'+r.addresses[0]+':'+r.port;}).catch(function(){if($('upload-address'))toast('The photo service is offline. Your saved photographs will be available when it reconnects.');});}
 function frameMenu(){openModal('A view worth keeping.','<p>Let your photographs fill the room.</p><div class="photo-count" id="photo-count">Checking your collection…</div><div class="modal-actions">'+action('start-frame','Start Frame',true)+action('add-photos','Add photographs')+action('frame-options','Frame preferences')+'</div><p class="fine-print">Use the arrows to change photographs. Press Back to return home.</p>');$('start-frame').onclick=startFrame;$('add-photos').onclick=manage;$('frame-options').onclick=settings;api('/api/photos').then(function(r){photos=r.photos;if($('photo-count'))$('photo-count').textContent=photos.length?photos.length+' photograph'+(photos.length===1?'':'s')+' in your collection':'Your collection is empty. The landscape is ready to display.';}).catch(function(){photos=[];if($('photo-count'))$('photo-count').textContent='The landscape is ready. Your photo library is currently offline.';});}
 function photoUrl(p){return base+'/photos/'+p.id+'?token='+encodeURIComponent(config.token);}
 function help(){clearTimeout(helpTimer);$('frame-help').style.opacity='1';helpTimer=setTimeout(function(){$('frame-help').style.opacity='0';},4500);}
 function setPhoto(direction){if(!photos.length){$('frame-image').src='assets/loch.jpg';return;}
  var candidate;if(direction===-1){candidate=photoIndex;for(var n=0;n<photos.length;n++){candidate=(candidate-1+photos.length)%photos.length;if(!failed[photos[candidate].id])break;}if(failed[photos[candidate].id])candidate=-1;}else candidate=core.nextPhoto(photos,photoIndex,failed);
  if(candidate<0){photos=[];$('frame-image').src='assets/loch.jpg';toast('These photos could not be opened. Showing the landscape.');return;}
  photoIndex=candidate;$('frame-image').src=photoUrl(photos[candidate]);
 }
 function schedule(){clearInterval(slideTimer);if(!paused)slideTimer=setInterval(function(){if(frameActive&&!document.hidden)setPhoto(1);},prefs.interval*1000);}
 function startFrame(){closeModal();frameActive=true;paused=false;failed={};photoIndex=-1;$('frame-image').style.objectFit=prefs.fit;$('frame-image').style.opacity=prefs.dim;$('home').classList.add('hidden');$('frame').classList.remove('hidden');setPhoto(1);schedule();help();clearTimeout(endTimer);endTimer=setTimeout(function(){stopFrame();toast('Frame finished.');},prefs.duration*60000);}
 function stopFrame(){frameActive=false;clearInterval(slideTimer);clearTimeout(endTimer);clearTimeout(helpTimer);$('frame').classList.add('hidden');$('home').classList.remove('hidden');$('frame-image').removeAttribute('src');focusApp();activity();}
 $('frame-image').onerror=function(){if(!frameActive||!photos.length)return;if(photos[photoIndex])failed[photos[photoIndex].id]=true;setPhoto(1);};
 $('settings-button').onclick=settings;$('frame-button').onclick=frameMenu;$('modal-close').onclick=closeModal;
 function activity(){document.body.classList.remove('idle');clearTimeout(idleTimer);idleTimer=setTimeout(function(){if(!frameActive&&$('modal').classList.contains('hidden'))document.body.classList.add('idle');},90000);}
 document.addEventListener('keydown',function(e){activity();var key=e.key;if(e.keyCode===461||e.keyCode===27)key='Back';if(e.keyCode===13)key='Enter';
  if(frameActive){e.preventDefault();help();if(key==='Back')stopFrame();else if(key==='ArrowRight'){setPhoto(1);schedule();}else if(key==='ArrowLeft'){setPhoto(-1);schedule();}else if(key==='Enter'){paused=!paused;schedule();toast(paused?'Frame paused. The session timer is still running.':'Frame resumed.');}return;}
  if(!$('modal').classList.contains('hidden')){if(key==='Back'){e.preventDefault();closeModal();return;}var nodes=Array.prototype.slice.call($('modal').querySelectorAll('button:not([disabled])'));var i=nodes.indexOf(document.activeElement);if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Tab'].indexOf(key)>=0){e.preventDefault();var delta=key==='ArrowLeft'||key==='ArrowUp'||(key==='Tab'&&e.shiftKey)?-1:1;nodes[(i+delta+nodes.length)%nodes.length].focus();}return;}
  if(key==='Back'){e.preventDefault();focusApp();return;}var isApp=document.activeElement.classList.contains('app-tile');
  if(isApp&&['ArrowLeft','ArrowRight'].indexOf(key)>=0){e.preventDefault();selected=core.moveFocus(selected,key,9,9);focusApp();}
  else if(isApp&&key==='ArrowUp'){e.preventDefault();$('frame-button').focus();}
  else if(!isApp&&key==='ArrowDown'){e.preventDefault();focusApp();}
  else if(!isApp&&(key==='ArrowLeft'||key==='ArrowRight')){e.preventDefault();(document.activeElement===$('frame-button')?$('settings-button'):$('frame-button')).focus();}
 });
 document.addEventListener('mousemove',activity);document.addEventListener('click',activity);
 document.addEventListener('visibilitychange',function(){if(document.hidden){clearInterval(slideTimer);}else{clock();activity();if(frameActive)schedule();else if($('modal').classList.contains('hidden'))focusApp();}});
 window.addEventListener('webOSRelaunch',function(){if(frameActive)stopFrame();if(!$('modal').classList.contains('hidden'))closeModal();focusApp();});
 clock();setInterval(clock,10000);focusApp();activity();window.__glassReadyAt=performance.now();
}());
