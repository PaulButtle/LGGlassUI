const test=require('node:test'),assert=require('node:assert/strict');
const makePolicy=require('../integration/startup-policy.js');
const own={type:'MVPD_IP',appId:'com.paulbuttle.glasshome'};
function harness(){
 let now=0,sequence=0,writes=0,enabled=true,current={type:'HDMI_1',appId:'com.webos.app.hdmi1'},fail=false;
 const timers=new Map();
 const policy=makePolicy({setTimeout(fn,delay){const id=++sequence;timers.set(id,{fn,at:now+delay});return id;},clearTimeout(id){timers.delete(id);},enabled(){return enabled;},readInput(){return current;},setPreferred(done){writes++;if(fail)done(Error('Native service unavailable'));else{current=own;done(null);}}});
 return {policy,get writes(){return writes;},get current(){return current;},set current(x){current=x;},set enabled(x){enabled=x;},set fail(x){fail=x;},advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}};
}
test('sets the native startup preference immediately without a dashboard-launch timer',()=>{const h=harness();h.policy.start();assert.equal(h.writes,1);assert.deepEqual(h.current,own);h.advance(12000);assert.equal(h.writes,1);});
test('does not rewrite an already correct startup preference',()=>{const h=harness();h.current=own;h.policy.start();h.policy.changed();h.advance(100);assert.equal(h.writes,0);});
test('coalesces input changes and restores only the next-start preference',()=>{const h=harness();h.current=own;h.policy.start();h.current={type:'HDMI_2',appId:'com.webos.app.hdmi2'};h.policy.changed();h.policy.changed();h.advance(79);assert.equal(h.writes,0);h.advance(1);assert.equal(h.writes,1);assert.deepEqual(h.current,own);});
test('retries a failed native call and honours recovery before retry',()=>{const h=harness();h.fail=true;h.policy.start();assert.equal(h.writes,1);h.enabled=false;h.advance(5000);assert.equal(h.writes,1);h.enabled=true;h.fail=false;h.policy.changed();h.advance(80);assert.equal(h.writes,2);h.current={type:'HDMI_1',appId:'com.webos.app.hdmi1'};h.policy.changed();h.policy.stop();h.advance(10000);assert.equal(h.writes,2);});
