export const COMPANY = {id:'halyk-demo',name:'Halyk',label:'Career Campus',synthetic:true};
export const DEPARTMENTS = [
  {id:'backend',name:'Backend Development',title:'Backend',caption:'Серверная разработка',x:-16,z:-15,color:'#748fb3'},
  {id:'frontend',name:'Frontend Development',title:'Frontend',caption:'Интерфейсы',x:-16,z:-5,color:'#66aa96'},
  {id:'qa',name:'Quality Assurance',title:'QA',caption:'Контроль качества',x:-16,z:5,color:'#a88bb4'},
  {id:'data',name:'Data & Analytics',title:'Data & Analytics',caption:'Данные и аналитика',x:-16,z:15,color:'#cdab6e'},
  {id:'product',name:'Product Management',title:'Product',caption:'Продуктовая команда',x:16,z:-15,color:'#b88d79'},
  {id:'hr',name:'Human Resources',title:'People & HR',caption:'Развитие команды',x:16,z:-5,color:'#81a883'},
  {id:'sales',name:'Sales',title:'Sales',caption:'Продажи',x:16,z:5,color:'#c594aa'},
  {id:'support',name:'Customer Support',title:'Support',caption:'Забота о клиентах',x:16,z:15,color:'#86a5b0'}
];
export const SERVICES = [
  {id:'reception',title:'Ресепшен',caption:'Вход в компанию',x:0,z:22,color:'#3d7963'},
  {id:'academy',title:'Академия',caption:'Обучение и сертификация',x:-3.1,z:1,color:'#b79554'},
  {id:'meeting',title:'Переговорная',caption:'Менторство и воркшопы',x:0,z:-11.7,color:'#778fac'},
  {id:'lounge',title:'Кофе-поинт',caption:'Встречи с коллегами',x:3.4,z:12,color:'#b88d78'},
];
export const DESKS = DEPARTMENTS.flatMap(d => [-4.2,4.2].flatMap(dx => [-2.3,2.3].map(dz=>({x:d.x+dx,z:d.z+dz,department:d.id}))));
export const WALLS = [
  {x:-25,z:2,w:.28,d:44},{x:25,z:2,w:.28,d:44},{x:0,z:-20,w:50,d:.28},
  {x:-14,z:24,w:22,d:.28},{x:14,z:24,w:22,d:.28},
  ...[-10,0,10,20].flatMap(z => [{x:-16,z,w:18,d:.2},{x:16,z,w:18,d:.2}]),
  ...DEPARTMENTS.flatMap(room=>{
    const x=room.x<0?-7:7;
    return [{x,z:room.z-3.05,w:.2,d:3.9},{x,z:room.z+3.05,w:.2,d:3.9}];
  }),
  {x:-4.3,z:-11,w:5.4,d:.2},{x:4.3,z:-11,w:5.4,d:.2}
];
export const FURNITURE_OBSTACLES = [
  ...DESKS.map(p=>({x:p.x,z:p.z,w:2.8,d:1.45})),
  ...DESKS.map(p=>({x:p.x,z:p.z+1.05,w:.65,d:.62})),
  {x:0,z:-16,w:7,d:2.5},
  {x:-4,z:-5,w:3,d:1.3},{x:-4,z:4,w:3,d:1.3},
  {x:4,z:-4,w:2.5,d:2.1},{x:4,z:4,w:2.5,d:2.1},
  {x:-4,z:12,w:3,d:1.5},{x:4,z:16,w:3,d:1.1},
  {x:3.9,z:21.7,w:4,d:1.5}
];
export const OBSTACLES = [...WALLS,...FURNITURE_OBSTACLES];
export const NAV = {minX:-31,maxX:31,minZ:-25,maxZ:33,cell:.5,radius:.26};
export function roomForDepartment(department){return DEPARTMENTS.find(d=>d.name===department)??DEPARTMENTS[0];}
export function roomAt(x,z){return DEPARTMENTS.find(d=>Math.abs(x-d.x)<8.85&&Math.abs(z-d.z)<4.9);}
export function walkable(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<NAV.minX||x>NAV.maxX||z<NAV.minZ||z>NAV.maxZ)return false;
  return !OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+NAV.radius&&Math.abs(z-o.z)<o.d/2+NAV.radius);
}
const NX=Math.round((NAV.maxX-NAV.minX)/NAV.cell)+1,NZ=Math.round((NAV.maxZ-NAV.minZ)/NAV.cell)+1;
const grid=new Uint8Array(NX*NZ);
for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++)grid[z*NX+x]=walkable(NAV.minX+x*NAV.cell,NAV.minZ+z*NAV.cell)?1:0;
function cellId(x,z){return Math.max(0,Math.min(NZ-1,Math.round((z-NAV.minZ)/NAV.cell)))*NX+Math.max(0,Math.min(NX-1,Math.round((x-NAV.minX)/NAV.cell)));}
function point(id){return {x:NAV.minX+(id%NX)*NAV.cell,z:NAV.minZ+Math.floor(id/NX)*NAV.cell};}
export function nearestWalkable(x,z){
  const start=cellId(x,z); if(grid[start])return point(start);
  const sx=start%NX,sz=Math.floor(start/NX);
  for(let r=1;r<14;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
    if(Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;
    const nx=sx+dx,nz=sz+dz;
    if(nx>=0&&nx<NX&&nz>=0&&nz<NZ&&grid[nz*NX+nx])return point(nz*NX+nx);
  }
  return null;
}
export function findPath(from,to){
  const startPoint=nearestWalkable(from.x,from.z),endPoint=nearestWalkable(to.x,to.z);
  if(!startPoint||!endPoint)return [];
  const start=cellId(startPoint.x,startPoint.z),end=cellId(endPoint.x,endPoint.z);
  if(start===end)return [endPoint];
  const parents=new Int32Array(grid.length).fill(-1),queue=new Int32Array(grid.length);let head=0,tail=0;
  parents[start]=start;queue[tail++]=start;
  while(head<tail){
    const id=queue[head++],x=id%NX,z=Math.floor(id/NX);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz;if(nx<0||nx>=NX||nz<0||nz>=NZ)continue;
      const next=nz*NX+nx;if(!grid[next]||parents[next]!==-1)continue;
      parents[next]=id;queue[tail++]=next;
      if(next===end){
        const result=[];let at=end;while(at!==start){result.push(point(at));at=parents[at];}
        result.push(startPoint);result.reverse();
        return result.filter((p,i)=>!i||i===result.length-1||((p.x-result[i-1].x)!==(result[i+1].x-p.x))||((p.z-result[i-1].z)!==(result[i+1].z-p.z)));
      }
    }
  }
  return [];
}
export function avatarFor(employee,index){
  // Appearance is tied to the employee ID, independent of dataset ordering.
  const numericId=Number(employee.employee_id.replace(/^E/,''));
  if(Number.isInteger(numericId)&&numericId>0)index=numericId-1;
  const shirts=['#4e8f7c','#648dac','#b97d65','#a993bd','#bfaa6f','#658075','#c48698','#7b80aa','#6f9b9c','#a6a080'];
  const pants=['#35465b','#6a6259','#4b655d','#4d4e5a','#8b8172'];
  const skin=['#edbd98','#bc8769','#e0ad86','#975f43','#f3cfac'];
  return {id:employee.employee_id,shirt:shirts[index%10],pants:pants[Math.floor(index/10)%5],hairStyle:Math.floor(index/50)%4,skin:skin[(index*7)%5],hair:['#3d2e24','#5e4230','#2b2c2d','#9a744a'][Math.floor(index/7)%4],accessory:index%3};
}
