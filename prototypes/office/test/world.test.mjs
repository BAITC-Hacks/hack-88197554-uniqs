import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createWorldServer} from '../server.mjs';
import {loadDataset,careerProfile,effectiveSkills,datasetDirectory} from '../lib/dataset.mjs';
import {avatarFor,findPath,walkable,DEPARTMENTS} from '../shared/world.mjs';

const data=loadDataset(datasetDirectory(fileURLToPath(new URL('..',import.meta.url))));
test('All employees have a unique, stable appearance',()=>{
  assert.equal(data.employees.length,200);
  const appearances=data.employees.map((e,i)=>{const {id,...appearance}=avatarFor(e,i);assert.deepEqual(avatarFor(e,999),avatarFor(e,i));return JSON.stringify(appearance);});
  assert.equal(new Set(appearances).size,200);
});
test('Routes between departments do not cross walls or furniture',()=>{
  for(const from of DEPARTMENTS)for(const to of DEPARTMENTS){
    const route=findPath(from,to);assert.ok(route.length);
    for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05);for(let j=0;j<=n;j++)assert.ok(walkable(a.x+(b.x-a.x)*j/n,a.z+(b.z-a.z)*j/n),`${from.id} → ${to.id}`);}
  }
});
test('Recommendations are eligible and never include mandatory or already completed events',()=>{
  for(const employee of data.employees){const p=careerProfile(employee,data);assert.ok(p.recommendations.length<=3);for(const event of p.recommendations){assert.equal(event.mandatory,false);assert.ok(event.target_roles.includes(employee.role));assert.ok(event.target_grades.includes(employee.grade));assert.ok(Object.entries(event.prerequisites).every(([id,v])=>(p.employee.skills[id]??0)>=v));if(event.event_id!=='EV_036')assert.ok(!data.history.some(h=>h.employee_id===employee.employee_id&&h.event_id===event.event_id&&h.status==='completed'));}}
});
test('Only completed activity after review changes skills, capped without lowering existing proficiency',()=>{
  const employee={employee_id:'test',last_review_date:'2026-09-10',skills:{a:4,b:1}};
  const events=[{event_id:'one',develops_skills:[{skill_id:'a',gain:1,max_level:3},{skill_id:'b',gain:1,max_level:3}]}];
  const history=[{employee_id:'test',event_id:'one',status:'completed',date:'2026-09-09'},{employee_id:'test',event_id:'one',status:'completed',date:'2026-09-11'},{employee_id:'test',event_id:'one',status:'completed',date:'2026-09-12'}];
  assert.deepEqual(effectiveSkills(employee,history,events,'2026-10-01'),{a:4,b:2});
});
test('Two clients share movement, profiles cannot be occupied twice, and personal API needs a session',async()=>{
  const app=createWorldServer({npcMotion:false});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+app.server.address().port;
  const request=async(route,payload,token)=>{const response=await fetch(origin+'/api/'+route,{method:payload===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});return {status:response.status,data:await response.json()};};
  try{
    assert.equal((await request('me')).status,401);
    const one=await request('join',{employeeId:'E0001'}),two=await request('join',{employeeId:'E0002'});
    assert.equal(one.status,200);assert.equal(two.status,200);assert.equal(app.snapshot().online,2);
    assert.equal((await request('join',{employeeId:'E0001'})).status,409);
    assert.equal((await request('me',undefined,two.data.token)).data.employee.employee_id,'E0002');
    const actor=app.actors.get('E0001');actor.x=0;actor.z=10;
    assert.equal((await request('input',{x:1,z:0},one.data.token)).status,200);
    await new Promise(resolve=>setTimeout(resolve,250));
    const remote=await request('bootstrap');assert.ok(remote.data.snapshot.actors.find(a=>a.id==='E0001').x>0);
    assert.ok(!('skills' in remote.data.employees[0]));
    actor.x=24.5;actor.z=5;await request('input',{x:1,z:0},one.data.token);
    await new Promise(resolve=>setTimeout(resolve,200));assert.ok(actor.x<=24.6);assert.ok(walkable(actor.x,actor.z));
    await request('leave',{},one.data.token);assert.equal(app.snapshot().online,1);
    assert.equal((await request('join',{employeeId:'E0001'})).status,200);
  }finally{await app.close();}
});
