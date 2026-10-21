'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const settings=require('../service/screensaver-settings.js');
const patch=require('../integration/screensaver-patch.js');
test('screensaver settings accept only bounded display choices',()=>{
 assert.deepEqual(settings.normalize(null),{mode:'lg',interval:60,fit:'contain',dim:0.55});
 assert.deepEqual(settings.validate({mode:'frame',interval:30,fit:'cover',dim:0.78}),{mode:'frame',interval:30,fit:'cover',dim:0.55});
 for(const value of [{mode:'shell'},{mode:'frame',path:'/tmp/evil'},{mode:'frame',interval:0},{mode:'frame',dim:2},{mode:'frame',fit:'bad'}])assert.throws(()=>settings.validate(value));
});
test('native patch preserves LG lifecycle and gates photos to its full screensaver state',()=>{
 const source='WebOSWindow {\n id: rootWindow\n UIController {\n id: uiController\n }\n}\n';
 const output=patch.insert(source);
 assert.ok(output.includes('id: rootWindow'));assert.ok(output.includes('id: uiController'));
 assert.ok(output.includes('Mode_ScreenSaver'));assert.ok(output.includes('glassFrameOverlay.item.ready'));
 assert.ok(output.includes('FramePhotographs.qml'));
 assert.throws(()=>patch.insert('not the expected interface'));
 assert.throws(()=>patch.insert(output));
});
test('screensaver mount decisions refuse foreign overlays and default safely on bad config',()=>{
 const decide=patch.decide;
 assert.equal(decide('frame',true,false,false),'mount');
 assert.equal(decide('lg',true,true,true),'unmount');
 assert.equal(decide('frame',false,false,false),'unsupported');
 assert.equal(decide('frame',true,true,false),'conflict');
 assert.equal(decide('broken',true,true,true),'unmount');
 assert.equal(decide('frame',true,true,true),'keep');
});
