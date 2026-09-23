import fs from 'node:fs';
import path from 'node:path';
export function datasetDirectory(root){
  if(process.env.WORLD_DATA_DIR)return path.resolve(process.env.WORLD_DATA_DIR);
  const local=path.join(root,'data');
  return fs.existsSync(path.join(local,'employees.json'))?local:path.resolve(root,'../../data');
}
export function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
  if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}const headers=rows.shift();return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
export function loadDataset(directory){
  const read=name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
  const employeeFile=read('employees.json'),eventFile=read('events.json'),skillFile=read('skills.json');
  const history=parseCSV(fs.readFileSync(path.join(directory,'activity_history.csv'),'utf8'));
  return {employees:employeeFile.employees,events:eventFile.events,skills:skillFile.skills,roleProfiles:skillFile.role_profiles,asOf:employeeFile.meta.as_of_date,history};
}
export function effectiveSkills(employee,history,events,asOf){
  const skills={...employee.skills};const eventMap=new Map(events.map(e=>[e.event_id,e]));
  const seen=new Set();
  for(const record of history.filter(h=>h.employee_id===employee.employee_id&&h.status==='completed'&&h.date>employee.last_review_date&&h.date<=asOf).sort((a,b)=>a.date.localeCompare(b.date))){
    if(seen.has(record.event_id)&&record.event_id!=='EV_036')continue;seen.add(record.event_id);
    for(const gain of eventMap.get(record.event_id)?.develops_skills??[]){const current=skills[gain.skill_id]??0;skills[gain.skill_id]=Math.max(current,Math.min(5,gain.max_level,current+gain.gain));}
  }
  return skills;
}
export function careerProfile(employee,dataset){
  const skills=effectiveSkills(employee,dataset.history,dataset.events,dataset.asOf);
  const grades=['Junior','Middle','Senior','Lead'];
  const target=employee.career_goal??{target_role:employee.role,target_grade:grades[Math.min(3,grades.indexOf(employee.grade)+1)]};
  const requirements=dataset.roleProfiles.find(p=>p.role===target.target_role&&p.grade===target.target_grade);
  const skillNames=new Map(dataset.skills.map(s=>[s.skill_id,s.name]));
  const gaps=Object.entries(requirements?.required_skills??{}).map(([id,required])=>({id,name:skillNames.get(id)??id,current:skills[id]??0,required,critical:requirements.critical_skills.includes(id)})).filter(g=>g.current<g.required).sort((a,b)=>Number(b.critical)-Number(a.critical)||(b.required-b.current)-(a.required-a.current));
  const ownHistory=dataset.history.filter(h=>h.employee_id===employee.employee_id);
  const completed=new Set(ownHistory.filter(h=>h.status==='completed').map(h=>h.event_id));
  const started=new Set(ownHistory.filter(h=>h.status==='in_progress').map(h=>h.event_id));
  const recommendations=dataset.events.filter(e=>!e.mandatory&&e.target_roles.includes(employee.role)&&e.target_grades.includes(employee.grade)&&(!completed.has(e.event_id)||e.event_id==='EV_036')&&!started.has(e.event_id)&&Object.entries(e.prerequisites).every(([id,required])=>(skills[id]??0)>=required)&&(e.format==='self_paced'||e.upcoming_sessions.some(date=>date>=dataset.asOf))).map(e=>{
    const gains=e.develops_skills.map(g=>{const current=skills[g.skill_id]??0;return {...g,name:skillNames.get(g.skill_id),current,next:Math.max(current,Math.min(5,g.max_level,current+g.gain))};}).filter(g=>g.next>g.current);
    let score=gains.reduce((sum,g)=>{const gap=gaps.find(x=>x.id===g.skill_id);return sum+(gap?Math.min(g.next-g.current,gap.required-gap.current)*(gap.critical?3:1):0);},0);
    const onlineFit=employee.work_format==='remote'&&e.format!=='offline';
    const prior=ownHistory.filter(h=>h.event_id===e.event_id&&['declined','dropped','no_show'].includes(h.status));
    if(score>0){score+=onlineFit?.3:0;score-=prior.length*.25;}
    return {...e,gains,score,reason:[`Подходит роли ${employee.role} и грейду ${employee.grade}.`,gains.filter(g=>gaps.some(x=>x.id===g.skill_id)).map(g=>`${g.name}: ${g.current} → ${g.next}`).join('; '),onlineFit?'Доступно удалённо.':`Формат: ${e.format}.`,prior.length?'Ранее участие не было завершено — можно выбрать альтернативу.':''].filter(Boolean).join(' '),zone:['mentoring','workshop','meetup'].includes(e.type)?'meeting':'academy'};
  }).filter(e=>e.score>0).sort((a,b)=>b.score-a.score||a.duration_hours-b.duration_hours).slice(0,3);
  return {employee:{...employee,skills},target,inferredGoal:!employee.career_goal,gaps,recommendations,historyCount:ownHistory.length,lastReview:employee.last_review_date,asOf:dataset.asOf};
}
