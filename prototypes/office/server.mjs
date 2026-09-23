import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadDataset,careerProfile,datasetDirectory} from './lib/dataset.mjs';
import {COMPANY,DEPARTMENTS,SERVICES,roomForDepartment,avatarFor,walkable,nearestWalkable,findPath} from './shared/world.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function createWorldServer({dataset=loadDataset(datasetDirectory(ROOT)),htmlPath=path.join(ROOT,'world.html'),npcMotion=true}={}){
  const sessions=new Map(),streams=new Set(),actors=new Map();
  let randomState=30102026,ticks=0;
  const random=()=>{randomState=(Math.imul(1664525,randomState)+1013904223)>>>0;return randomState/4294967296;};
  function roomPoint(room){for(let i=0;i<120;i++){const p=nearestWalkable(room.x+(random()-.5)*15,room.z+(random()-.5)*8);if(p&&Math.abs(p.x-room.x)<8&&Math.abs(p.z-room.z)<4.3)return p;}return nearestWalkable(room.x,room.z);}
  dataset.employees.forEach((employee,index)=>{
    const room=roomForDepartment(employee.department),position=roomPoint(room);
    actors.set(employee.employee_id,{id:employee.employee_id,index,x:position.x,z:position.z,heading:random()*Math.PI*2,moving:false,path:[],input:{x:0,z:0},session:null,nextWander:Date.now()+1000+random()*14000,room});
  });
  const publicEmployees=dataset.employees.map((e,i)=>({id:e.employee_id,name:e.full_name,department:e.department,role:e.role,grade:e.grade,workFormat:e.work_format,avatar:avatarFor(e,i)}));
  function snapshot(){return {time:Date.now(),online:sessions.size,actors:[...actors.values()].map(a=>({id:a.id,x:+a.x.toFixed(3),z:+a.z.toFixed(3),h:+a.heading.toFixed(3),moving:a.moving,live:!!a.session}))};}
  function broadcast(){const message=`data: ${JSON.stringify(snapshot())}\n\n`;for(const stream of streams){if(stream.writableLength>262144){stream.destroy();streams.delete(stream);}else stream.write(message);}}
  function endSession(token){const s=sessions.get(token);if(!s)return;const actor=actors.get(s.employeeId);actor.session=null;actor.path=[];actor.input={x:0,z:0};actor.nextWander=Date.now()+5000;sessions.delete(token);}
  function moveStep(actor,dx,dz){
    if(!dx&&!dz)return false;
    let moved=false;
    if(walkable(actor.x+dx,actor.z+dz)){actor.x+=dx;actor.z+=dz;moved=true;}
    else {if(walkable(actor.x+dx,actor.z)){actor.x+=dx;moved=dx!==0;}if(walkable(actor.x,actor.z+dz)){actor.z+=dz;moved=moved||dz!==0;}}
    if(moved)actor.heading=Math.atan2(dx,dz);
    return moved;
  }
  const timer=setInterval(()=>{
    const now=Date.now();ticks++;
    for(const [token,s] of sessions)if(now-s.lastSeen>45000)endSession(token);
    for(const actor of actors.values()){
      actor.moving=false;
      if(actor.session){const s=sessions.get(actor.session);if(now-(s?.lastInput??0)>700)actor.input={x:0,z:0};}
      if(actor.session&&(actor.input.x||actor.input.z)){
        actor.path=[];actor.moving=moveStep(actor,actor.input.x*.155,actor.input.z*.155);
      }else if(actor.path.length){
        const target=actor.path[0],dx=target.x-actor.x,dz=target.z-actor.z,distance=Math.hypot(dx,dz),speed=actor.session?.155:.07;
        if(distance<speed){actor.moving=moveStep(actor,dx,dz);actor.path.shift();}
        else actor.moving=moveStep(actor,dx/distance*speed,dz/distance*speed);
        if(!actor.moving)actor.path=[];
      }else if(!actor.session&&npcMotion&&now>actor.nextWander){
        const dest=random()<.94?roomPoint(actor.room):{x:actor.room.x<0?-5.5:5.5,z:actor.room.z};
        actor.path=findPath(actor,dest);actor.nextWander=now+5000+random()*16000;
      }
    }
    if(ticks%2===0)broadcast();
  },50);
  timer.unref();
  const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const sessionFor=req=>sessions.get((req.headers.authorization??'').replace(/^Bearer /,''));
  async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)throw Object.assign(new Error('Запрос слишком большой'),{status:413});}try{return JSON.parse(raw||'{}');}catch{throw Object.assign(new Error('Некорректный JSON'),{status:400});}}
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const url=new URL(req.url,'http://local');
      if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return send(res,403,{error:'Другой источник запроса'});
      if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/world.html')){
        if(!fs.existsSync(htmlPath))return send(res,503,{error:'Сначала выполните npm run build'});
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' data: blob:; img-src 'self' data: blob:; worker-src blob:"});
        return fs.createReadStream(htmlPath).pipe(res);
      }
      if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
      if(req.method==='GET'&&url.pathname==='/api/bootstrap'){
        const port=server.address()?.port;
        const joinUrls=Object.values(os.networkInterfaces()).flatMap(a=>a??[]).filter(a=>a.family==='IPv4'&&!a.internal).map(a=>`http://${a.address}:${port}`);
        return send(res,200,{company:COMPANY,departments:DEPARTMENTS.map(d=>({...d,count:dataset.employees.filter(e=>e.department===d.name).length})),services:SERVICES,employees:publicEmployees,asOf:dataset.asOf,eventCount:dataset.events.length,historyCount:dataset.history.length,joinUrls,snapshot:snapshot()});
      }
      if(req.method==='GET'&&url.pathname==='/api/stream'){
        if(streams.size>=256)return send(res,503,{error:'Достигнут лимит подключений'});
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(`data: ${JSON.stringify(snapshot())}\n\n`);streams.add(res);req.on('close',()=>streams.delete(res));return;
      }
      if(req.method==='POST'&&url.pathname==='/api/join'){
        const payload=await body(req),actor=actors.get(payload.employeeId);if(!actor)return send(res,400,{error:'Сотрудник не найден'});
        const old=sessionFor(req);if(old?.employeeId===payload.employeeId)return send(res,200,{token:old.token,employeeId:old.employeeId,snapshot:snapshot()});
        if(actor.session)return send(res,409,{error:'Этот персонаж уже занят другим участником'});
        if(old)endSession(old.token);
        const token=crypto.randomUUID();sessions.set(token,{token,employeeId:actor.id,lastSeen:Date.now(),lastInput:0});
        actor.session=token;actor.path=[];actor.input={x:0,z:0};
        send(res,200,{token,employeeId:actor.id,snapshot:snapshot()});broadcast();return;
      }
      const session=sessionFor(req);
      if(url.pathname.startsWith('/api/')&&!session)return send(res,401,{error:'Выберите сотрудника, чтобы войти'});
      if(session)session.lastSeen=Date.now();
      if(req.method==='GET'&&url.pathname==='/api/me')return send(res,200,careerProfile(dataset.employees.find(e=>e.employee_id===session.employeeId),dataset));
      if(req.method==='POST'&&url.pathname==='/api/target'){
        const p=await body(req);if(typeof p.x!=='number'||typeof p.z!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>31||p.z< -25||p.z>33)return send(res,400,{error:'Точка вне карты'});
        const actor=actors.get(session.employeeId);actor.path=findPath(actor,p);actor.input={x:0,z:0};
        return send(res,200,{path:actor.path});
      }
      if(req.method==='POST'&&url.pathname==='/api/input'){
        const p=await body(req);if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return send(res,400,{error:'Неверное направление'});
        const length=Math.max(1,Math.hypot(p.x,p.z));const actor=actors.get(session.employeeId);actor.input={x:p.x/length,z:p.z/length};session.lastInput=Date.now();actor.path=[];return send(res,200,{ok:true});
      }
      if(req.method==='POST'&&url.pathname==='/api/heartbeat')return send(res,200,{ok:true});
      if(req.method==='POST'&&url.pathname==='/api/leave'){endSession(session.token);send(res,200,{ok:true});broadcast();return;}
      return send(res,404,{error:'Не найдено'});
    }catch(error){send(res,error.status??500,{error:error.status?error.message:'Ошибка сервера'});if(!error.status)console.error(error);}
  });
  return {server,snapshot,actors,sessions,close(){clearInterval(timer);for(const stream of streams)stream.end();streams.clear();return new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const app=createWorldServer(),port=Number(process.env.WORLD_PORT||4180),host=process.env.WORLD_HOST||'0.0.0.0';
  app.server.listen(port,host,()=>{
    console.log(`Career Quest World: http://127.0.0.1:${port}`);
    if(host==='0.0.0.0')for(const interfaces of Object.values(os.networkInterfaces()))for(const address of interfaces??[])if(address.family==='IPv4'&&!address.internal)console.log(`LAN: http://${address.address}:${port}`);
  });
  process.on('SIGINT',()=>app.close().then(()=>process.exit(0)));
}
