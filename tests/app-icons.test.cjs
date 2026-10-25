'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {syncIcons,readIcon}=require('../integration/sync-app-icons.js');
// An original one-pixel test image, not third-party brand artwork.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1kAAAAASUVORK5CYII=','base64');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'glass-icons-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const root=path.join(dir,'apps');fs.mkdirSync(root);return {dir,root,out:path.join(dir,'icons')};}
function app(root,id,info){const folder=path.join(root,id);fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'appinfo.json'),JSON.stringify({id,...info}));return folder;}
test('setup copies the installed app artwork byte-for-byte and falls back to its small icon',t=>{
 const {root,out}=fixture(t),large=app(root,'large',{largeIcon:'large.png',icon:'small.png'}),small=app(root,'small',{largeIcon:'missing.png',icon:'small.png'});
 fs.writeFileSync(path.join(large,'large.png'),png);fs.writeFileSync(path.join(small,'small.png'),png);
 assert.deepEqual(syncIcons([{id:'large'},{id:'small'}],[root],out),{copied:['large','small'],missing:[]});
 assert.deepEqual(fs.readFileSync(path.join(out,'large.png')),png);assert.deepEqual(fs.readFileSync(path.join(out,'small.png')),png);
});
test('icon collection rejects traversal, escaping symlinks, non-images and oversized dimensions',t=>{
 const {dir,root,out}=fixture(t),folder=app(root,'demo',{icon:'../../outside.png'});fs.writeFileSync(path.join(dir,'outside.png'),png);
 fs.symlinkSync(path.join(dir,'outside.png'),path.join(folder,'link.png'));
 fs.writeFileSync(path.join(folder,'text.png'),'not an image'.repeat(10));
 const huge=Buffer.from(png);huge.writeUInt32BE(50000,16);fs.writeFileSync(path.join(folder,'huge.png'),huge);
 for(const name of ['../../outside.png','link.png','text.png','huge.png'])assert.throws(()=>readIcon(folder,name));
 assert.deepEqual(syncIcons([{id:'demo'}],[root],out),{copied:[],missing:['demo']});
 assert.throws(()=>syncIcons([{id:'../outside'}],[root],out),/Invalid shortcut ID/);
});
test('an uninstalled app loses its stale cached artwork without affecting other files',t=>{
 const {root,out}=fixture(t);fs.mkdirSync(out);fs.writeFileSync(path.join(out,'gone.png'),png);fs.writeFileSync(path.join(out,'keep.txt'),'keep');
 assert.deepEqual(syncIcons([{id:'gone'}],[root],out),{copied:[],missing:['gone']});
 assert.equal(fs.existsSync(path.join(out,'gone.png')),false);assert.equal(fs.readFileSync(path.join(out,'keep.txt'),'utf8'),'keep');
});
