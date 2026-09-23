import {OfficeWorld,avatarIcon} from './scene.js';

const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let world,bootstrap,profile,token=sessionStorage.getItem('cq-token'),activeId=null,liveIds=new Set(),destination=null,chosenEvent=null,toastTimer;
const icons=new Map(),keys=new Set();
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
async function api(route,payload){const res=await fetch('/api/'+route,{method:payload===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Ошибка соединения');return data;}
function icon(employee){if(!icons.has(employee.id))icons.set(employee.id,avatarIcon(employee.avatar));return icons.get(employee.id);}
function setMode(mode){world.setMode(mode);$('campus-mode').setAttribute('aria-pressed',mode==='campus');$('office-mode').setAttribute('aria-pressed',mode==='office');$('view-kicker').textContent=mode==='campus'?'HALYK · CAREER CAMPUS':'HALYK · ПЕРВЫЙ ЭТАЖ';$('view-title').textContent=mode==='campus'?'Одна компания. Один мир.':'Внутри компании';}
function snapshot(data){world.setActors(data);$('presence-count').textContent=data.online+' онлайн';const next=new Set(data.actors.filter(a=>a.live).map(a=>a.id));const changed=[...next].join()!==[...liveIds].join();liveIds=next;if(changed&&$('employee-dialog').open)renderDirectory();if(destination&&activeId){const actor=data.actors.find(a=>a.id===activeId);if(actor&&Math.hypot(actor.x-destination.x,actor.z-destination.z)<.35){$('destination-note').textContent='Вы на месте';world.setPath([]);destination=null;setTimeout(()=>$('destination').hidden=true,2500);}}}
function showDirectory(){$('employee-dialog').showModal();renderDirectory();$('employee-search').focus();}
function renderDirectory(){
  const query=$('employee-search').value.trim().toLowerCase(),department=$('employee-department').value;
  const employees=bootstrap.employees.filter(e=>(department==='all'||e.department===department)&&[e.name,e.role,e.id].join(' ').toLowerCase().includes(query));
  $('directory-status').textContent=`Найдено: ${employees.length} · занято: ${liveIds.size}`;
  $('employee-list').innerHTML=employees.map(e=>`<button class="employee-row" data-employee="${escape(e.id)}" ${liveIds.has(e.id)&&e.id!==activeId?'disabled':''}><img class="employee-thumb" src="${icon(e)}" alt=""><span><strong>${escape(e.name)}</strong><small>${escape(e.role)} · ${escape(e.grade)}</small><small>${escape(e.id)} · ${escape(bootstrap.departments.find(d=>d.name===e.department)?.title)}</small></span>${liveIds.has(e.id)?`<span class="busy">${e.id===activeId?'Это вы':'Онлайн'}</span>`:''}</button>`).join('');
}
async function join(id){try{const data=await api('join',{employeeId:id});token=data.token;sessionStorage.setItem('cq-token',token);activeId=data.employeeId;snapshot(data.snapshot);await loadProfile();$('employee-dialog').close();setMode('office');world.focusMe();toast('Вы вошли. WASD — ходить, клик по полу — построить маршрут.');}catch(error){toast(error.message);}}
async function loadProfile(){
  profile=await api('me');activeId=profile.employee.employee_id;world.setControlled(activeId);const e=bootstrap.employees.find(e=>e.id===activeId);
  $('profile-identity').innerHTML=`<div class="profile-avatar"><img src="${icon(e)}" alt="Ваш персонаж"></div><div><strong>${escape(e.name)}</strong><span>${escape(e.role)} · ${escape(e.grade)}</span></div>`;
  $('profile-department').textContent=e.department;$('profile-content').hidden=true;$('own-profile').hidden=false;
  $('career-goal').textContent=profile.target.target_role+' · '+profile.target.target_grade;
  $('goal-note').textContent=profile.inferredGoal?'Предложенный следующий шаг — можно уточнить цель':'Личная цель из профиля сотрудника';
  $('snapshot-date').textContent='Срез данных: '+profile.asOf;$('me-label').textContent=e.name+' · вы';
  $('recommendations').innerHTML=profile.recommendations.length?profile.recommendations.map((event,i)=>`<article class="quest-card" tabindex="0" role="button" data-event="${escape(event.event_id)}" aria-label="Открыть ${escape(event.title)}"><div class="quest-top"><span>ШАГ ${i+1} · ${escape(event.type)}</span><span>↗</span></div><h3>${escape(event.title)}</h3><p>${escape(event.gains.filter(g=>profile.gaps.some(x=>x.id===g.skill_id)).map(g=>g.name+' '+g.current+' → '+g.next).join(' · '))}</p><div class="quest-bottom"><span>${event.duration_hours} ч · ${escape(event.format)}</span><span>Подробнее →</span></div></article>`).join(''):'<p class="profile-note">В каталоге нет доступной активности, которая закрывает текущие пробелы для этой цели.</p>';
  $('skill-gaps').innerHTML=profile.gaps.length?profile.gaps.map(g=>`<div class="skill-gap"><div><span>${escape(g.name)}</span><span>${g.current} / ${g.required}</span></div>${g.critical?'<small>Критично для целевой роли</small>':''}<div class="skill-track"><span style="width:${g.current/g.required*100}%"></span></div></div>`).join(''):'<p class="profile-note">Требуемые навыки уже достигнуты.</p>';
}
function showEvent(id){chosenEvent=profile.recommendations.find(e=>e.event_id===id);if(!chosenEvent)return;const e=chosenEvent;$('event-type').textContent=e.type+' · '+e.format;$('event-title').textContent=e.title;$('event-body').innerHTML=`<p>${escape(e.description)}</p><div class="event-info"><span>${e.duration_hours} часов</span><span>${escape(e.upcoming_sessions.find(d=>d>=profile.asOf)||'В удобное время')}</span></div><p class="event-reason">${escape(e.reason)}</p>${e.gains.map(g=>`<div class="event-gain"><span>${escape(g.name)}</span><strong>${g.current} → ${g.next}</strong></div>`).join('')}<p>Прогноз развития навыков по датасету. Перемещение в офисе не отмечает обучение пройденным.</p>`;$('go-to-event').textContent=e.zone==='meeting'?'Пройти в переговорную':'Пройти в академию';$('event-dialog').showModal();}
async function moveTo(x,z,room){
  if(world.mode==='campus'){setMode('office');world.overview();return;}
  if(!activeId){if(room)world.focus(x,z,2.4);else showDirectory();return;}
  try{keys.clear();const data=await api('target',{x,z});if(!data.path.length){toast('К этой точке пока нет прохода. Выберите место рядом.');return;}const p=world.positions.get(activeId);world.setPath([{x:p.x,z:p.z},...data.path]);destination=data.path.at(-1);$('destination-title').textContent=room?.title||'Выбранная точка';$('destination-note').textContent='Идём по маршруту…';$('destination').hidden=false;}catch(error){toast(error.message);}
}
function selectRoom(room){setMode('office');world.focus(room.x,room.z,2.5);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.room===room.id));$('view-title').textContent=room.title;$('world-status').textContent=room.caption;if(activeId)moveTo(room.x,room.z,room);}
function clearSession(){token=null;activeId=null;profile=null;sessionStorage.removeItem('cq-token');world.setControlled(null);world.setPath([]);$('own-profile').hidden=true;$('profile-content').hidden=false;$('profile-identity').innerHTML='<div class="profile-avatar">?</div><div><strong>Выберите сотрудника</strong><span>Каждому — свой персонаж</span></div>';$('profile-department').textContent='200 профилей из датасета';$('destination').hidden=true;}
function setupUI(){
  $('departments').innerHTML=bootstrap.departments.map(d=>`<button data-room="${d.id}"><span class="dept-dot" style="background:${d.color}"></span>${escape(d.title)}<span class="count">${d.count}</span></button>`).join('');
  $('services').innerHTML=bootstrap.services.map((d,i)=>`<button data-room="${d.id}"><span class="service-mark">${['⌂','◇','▤','☕'][i]}</span>${escape(d.title)}</button>`).join('');
  $('employee-department').innerHTML+=[...bootstrap.departments].map(d=>`<option value="${escape(d.name)}">${escape(d.title)}</option>`).join('');
  for(const nav of [$('departments'),$('services')])nav.addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(button)selectRoom([...bootstrap.departments,...bootstrap.services].find(d=>d.id===button.dataset.room));});
  $('choose-employee').onclick=showDirectory;$('join-main').onclick=showDirectory;$('employee-search').oninput=renderDirectory;$('employee-department').onchange=renderDirectory;
  $('employee-list').onclick=e=>{const button=e.target.closest('[data-employee]');if(button&&!button.disabled)join(button.dataset.employee);};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  $('campus-mode').onclick=()=>setMode('campus');$('office-mode').onclick=()=>{setMode('office');world.overview();};
  $('zoom-in').onclick=()=>{world.focusTarget=null;world.camera.zoom=Math.min(5,world.camera.zoom*1.25);world.camera.updateProjectionMatrix();};$('zoom-out').onclick=()=>{world.focusTarget=null;world.camera.zoom=Math.max(.55,world.camera.zoom/1.25);world.camera.updateProjectionMatrix();};
  $('overview').onclick=()=>world.overview();$('follow-me').onclick=()=>activeId?world.focusMe():showDirectory();$('labels-toggle').onclick=()=>{world.labelsVisible=!world.labelsVisible;$('labels-toggle').setAttribute('aria-pressed',world.labelsVisible);};
  $('route-tab').onclick=()=>{$('route-tab').setAttribute('aria-pressed',true);$('skills-tab').setAttribute('aria-pressed',false);$('recommendations').hidden=false;$('skill-gaps').hidden=true;};$('skills-tab').onclick=()=>{$('route-tab').setAttribute('aria-pressed',false);$('skills-tab').setAttribute('aria-pressed',true);$('recommendations').hidden=true;$('skill-gaps').hidden=false;};
  $('recommendations').onclick=e=>{const card=e.target.closest('[data-event]');if(card)showEvent(card.dataset.event);};$('recommendations').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const card=e.target.closest('[data-event]');if(card){e.preventDefault();showEvent(card.dataset.event);}}};
  $('go-to-event').onclick=()=>{$('event-dialog').close();selectRoom(bootstrap.services.find(s=>s.id===chosenEvent.zone));};
  $('stop-walking').onclick=()=>{keys.clear();api('input',{x:0,z:0}).catch(e=>toast(e.message));destination=null;world.setPath([]);$('destination').hidden=true;};
  $('leave').onclick=async()=>{try{await api('leave',{});clearSession();toast('Персонаж свободен для другого участника.');}catch(e){toast(e.message);}};
  $('invite').onclick=()=>{$('invite-url').value=location.origin;$('lan-urls').innerHTML=bootstrap.joinUrls.length?'<div class="lan-caption">На другом устройстве в вашей сети</div>'+bootstrap.joinUrls.map(url=>`<div class="lan-url">${escape(url)}</div>`).join(''):'';$('invite-dialog').showModal();};$('copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin);toast('Адрес скопирован');}catch{$('invite-url').select();toast('Выделен адрес — нажмите Ctrl+C');}};
  const allowed=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
  addEventListener('keydown',e=>{if(!activeId||document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||!allowed.includes(e.code))return;e.preventDefault();keys.add(e.code);});
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
  document.querySelectorAll('[data-move]').forEach(b=>{const code={up:'KeyW',left:'KeyA',down:'KeyS',right:'KeyD'}[b.dataset.move];b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(code);};b.onpointerup=b.onpointercancel=()=>keys.delete(code);});
  let wasMoving=false,inFlight=false;
  setInterval(async()=>{if(!activeId||inFlight)return;const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp')),moving=!!(x||z);if(!moving&&!wasMoving)return;wasMoving=moving;inFlight=true;if(moving){world.setPath([]);destination=null;$('destination').hidden=true;}try{await api('input',world.movementVector(x,z));}catch(e){toast(e.message);}finally{inFlight=false;}},100);
  setInterval(()=>{if(token)api('heartbeat',{}).catch(()=>{$('connection-status').textContent='Переподключение…';});},10000);
  setInterval(()=>{if(!world)return;$('online-labels').innerHTML=world.mode==='office'?[...liveIds].filter(id=>id!==activeId).map(id=>{const p=world.positions.get(id),e=bootstrap.employees.find(e=>e.id===id);if(!p||!e)return '';const screen=world.project(p.x,1.75,p.z);return screen.visible?`<span class="online-label" style="left:${screen.x}px;top:${screen.y}px">${escape(e.name)}</span>`:'';}).join(''):'';},150);
}
async function main(){
  try{
    bootstrap=await api('bootstrap');
    world=new OfficeWorld($('world'),bootstrap.employees,{onMove:moveTo,onInspect:e=>toast(`${e.name} · ${e.role} · ${e.grade}${liveIds.has(e.id)?' · онлайн':''}`),onHover:(e,x,y)=>{const el=$('actor-tooltip');el.hidden=!e;if(e){el.innerHTML=`<strong>${escape(e.name)}</strong><span>${escape(e.role)} · ${escape(e.grade)}</span>`;el.style.left=Math.min(innerWidth-240,x+14)+'px';el.style.top=Math.max(75,y-57)+'px';}},onReady:()=>{$('loading').hidden=true;}});
    snapshot(bootstrap.snapshot);setupUI();await world.loadAssets();world.overview();
    const stream=new EventSource('/api/stream');stream.onmessage=e=>{snapshot(JSON.parse(e.data));$('connection-status').textContent='Общий мир подключён';document.querySelector('.connection-dot').classList.remove('offline');};stream.onerror=()=>{$('connection-status').textContent='Восстанавливаем связь…';document.querySelector('.connection-dot').classList.add('offline');};
    if(token){try{await loadProfile();}catch{clearSession();}}
  }catch(error){console.error(error);$('loading-note').textContent='Не удалось открыть офис: '+error.message;$('connection-status').textContent='Ошибка загрузки';}
}
main();
