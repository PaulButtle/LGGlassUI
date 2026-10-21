const test=require('node:test');const assert=require('node:assert/strict');
let c;try{c=require('../app/core.js');}catch(e){c={};}
test('remote focus does not leave a row at the right edge',()=>{assert.equal(typeof c.moveFocus,'function');assert.equal(c.moveFocus(8,'ArrowRight',9,9),8);assert.equal(c.moveFocus(0,'ArrowLeft',9,9),0);});
test('vertical navigation clamps the shorter final row',()=>{assert.equal(typeof c.moveFocus,'function');assert.equal(c.moveFocus(4,'ArrowDown',5,9),8);assert.equal(c.moveFocus(8,'ArrowUp',5,9),3);});
test('corrupt saved preferences fall back to bounded defaults',()=>{assert.equal(typeof c.preferences,'function');assert.deepEqual(c.preferences('{broken'),{interval:60,fit:'contain',duration:30,dim:0.78});assert.deepEqual(c.preferences('{"interval":0,"fit":"bad","duration":999,"dim":9}'),{interval:60,fit:'contain',duration:30,dim:0.78});});
test('frame skips failed photos and handles empty collections',()=>{assert.equal(typeof c.nextPhoto,'function');assert.equal(c.nextPhoto([{id:'a'},{id:'b'},{id:'c'}],0,{b:true}),2);assert.equal(c.nextPhoto([{id:'a'}],0,{a:true}),-1);assert.equal(c.nextPhoto([],0,{}),-1);});
test('malformed saved focus cannot prevent Home from starting',()=>{assert.equal(c.savedFocus('1.5',9),0);assert.equal(c.savedFocus('-2',9),0);assert.equal(c.savedFocus('Infinity',9),0);assert.equal(c.savedFocus('8',9),8);});
test('greeting follows local day periods and optional household names',()=>{
 for(const [hour,period]of [[0,'morning'],[11,'morning'],[12,'afternoon'],[17,'afternoon'],[18,'evening'],[23,'evening']]){
  assert.equal(c.greeting(hour),'Good '+period);
  assert.equal(c.greeting(hour,' Alex and Sam '),'Good '+period+', Alex and Sam');
 }
 assert.equal(c.greeting(10,''),'Good morning');
});
