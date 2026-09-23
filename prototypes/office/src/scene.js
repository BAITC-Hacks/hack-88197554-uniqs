import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {DEPARTMENTS,SERVICES,DESKS,WALLS} from '../shared/world.mjs';

const materialCache=new Map();
const mat=color=>{if(!materialCache.has(color))materialCache.set(color,new THREE.MeshStandardMaterial({color,roughness:.82}));return materialCache.get(color);};
function box(parent,x,y,z,w,h,d,color,rotation=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof color==='string'?mat(color):color);m.position.set(x,y,z);m.rotation.y=rotation;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(parent,x,y,z,radius,height,color,sides=10){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,sides),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function flattenStatic(root){
  root.updateMatrixWorld(true);const buckets=new Map();
  root.traverse(node=>{if(!node.isMesh||Array.isArray(node.material))return;const geometry=node.geometry.clone();geometry.applyMatrix4(node.matrixWorld);const g=geometry.index?geometry.toNonIndexed():geometry;for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));const key=node.material.uuid;if(!buckets.has(key))buckets.set(key,{material:node.material,geometries:[]});buckets.get(key).geometries.push(g);});
  root.clear();for(const {material,geometries} of buckets.values()){const combined=mergeGeometries(geometries,false);if(!combined)continue;const mesh=new THREE.Mesh(combined,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);for(const g of geometries)g.dispose();}
}

export class OfficeWorld{
  constructor(container,employees,{onMove,onInspect,onHover,onReady}){
    this.container=container;this.employees=employees;this.onMove=onMove;this.onInspect=onInspect;this.onHover=onHover;this.onReady=onReady;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#eaf0e2');this.scene.fog=new THREE.Fog('#eaf0e2',100,205);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','3D-офис Halyk с 200 персонажами');this.renderer.domElement.setAttribute('tabindex','0');
    this.camera=new THREE.OrthographicCamera(-40,40,32,-32,.1,250);this.camera.position.set(54,70,80);this.camera.lookAt(0,0,2);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,0,2);this.controls.enableDamping=true;this.controls.dampingFactor=.1;this.controls.minZoom=.55;this.controls.maxZoom=5;this.controls.minPolarAngle=.2;this.controls.maxPolarAngle=Math.PI*.43;this.controls.screenSpacePanning=false;this.controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.targetPoint=new THREE.Vector3();this.positions=new Map();this.latest=new Map();this.mode='office';this.activeId=null;this.offset=new THREE.Vector3(43,58,62);this.focusTarget=null;this.lastTime=0;this.labelsVisible=true;
    this.interior=new THREE.Group();this.exterior=new THREE.Group();this.landscape=new THREE.Group();this.scene.add(this.interior,this.exterior,this.landscape);
    this.scene.add(new THREE.HemisphereLight('#fffaf0','#aac196',2.6));const sun=new THREE.DirectionalLight('#fff0d2',3);sun.position.set(20,55,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-50;sun.shadow.camera.right=50;sun.shadow.camera.top=50;sun.shadow.camera.bottom=-50;sun.shadow.camera.far=120;sun.shadow.normalBias=.07;sun.shadow.bias=-.0002;this.scene.add(sun);const fill=new THREE.DirectionalLight('#d3e2f5',.8);fill.position.set(-35,20,-20);this.scene.add(fill);
    this.createLandscape();this.createArchitecture();this.createAvatars();this.createLabels();this.setupInput();
    new ResizeObserver(()=>this.resize()).observe(container);this.resize();this.setMode('office');this.renderer.setAnimationLoop(time=>this.frame(time));
  }
  async loadAssets(){
    const loader=new GLTFLoader();const {assets,texture}=window.WORLD_ASSETS;this.assets={};
    await Promise.all(Object.entries(assets).map(async([id,data])=>{const json=structuredClone(data);for(const im of json.images??[])im.uri=texture;const gltf=await loader.parseAsync(JSON.stringify(json),'');this.assets[id]=gltf.scene;}));
    this.decorate();flattenStatic(this.interior);flattenStatic(this.landscape);flattenStatic(this.exterior);this.onReady?.();
  }
  asset(id,x,z,height=1,rotation=0,parent=this.interior,y=0){
    const source=this.assets?.[id];if(!source)return;const object=source.clone(true),bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());object.position.set(-center.x,-bounds.min.y,-center.z);const holder=new THREE.Group();holder.add(object);holder.scale.setScalar(height/Math.max(.03,size.y));holder.rotation.y=rotation;holder.position.set(x,y,z);holder.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});parent.add(holder);return holder;
  }
  createLandscape(){
    box(this.landscape,0,-.42,3,170,.6,150,'#cbdcba');box(this.landscape,0,-.08,3,55,.12,48,'#dfdecd');
    box(this.landscape,0,-.015,28,12,.08,8,'#e6dfca');box(this.landscape,0,-.045,35,80,.08,6,'#c0c3b5');
    for(let x=-38;x<=38;x+=5)box(this.landscape,x,0,35,2.6,.015,.12,'#f1f0dd');
    for(const side of [-1,1])for(const z of [-19,-7,5,18,29])this.tree(side*(29+(Math.abs(z)%3)),z,side+z);
    for(const x of [-19,-9,9,19]){box(this.landscape,x,.25,29,3.6,.5,2.2,'#aab697');for(let k=-1;k<=1;k++)this.shrub(x+k,.7,29,.8);}
    for(const x of [-10,10]){box(this.landscape,x,.46,25.9,3.3,.16,.85,'#a78b63');box(this.landscape,x,.95,26.27,3.3,.85,.15,'#b7996e');for(const dx of [-1.1,1.1])box(this.landscape,x+dx,.22,25.9,.13,.45,.55,'#5c7161');}
  }
  shrub(x,y,z,r,parent=this.landscape){const sphere=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),mat('#8aac72'));sphere.position.set(x,y,z);sphere.scale.y=.7;sphere.castShadow=true;parent.add(sphere);}
  tree(x,z,seed){cylinder(this.landscape,x,1.1,z,.2,2.1,'#9a7955',7);const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7,1),mat(seed%2?'#87af72':'#9dbd80'));m.position.set(x,3,z);m.scale.set(1,1.25,1);m.castShadow=true;this.landscape.add(m);}
  createArchitecture(){
    box(this.interior,0,-.14,2,50,.28,44,'#f0e9d5');
    for(let z=-19;z<24;z+=1.4)box(this.interior,0,.007,z,49.7,.01,.024,'#e0d6bd');
    for(const d of DEPARTMENTS){const c=new THREE.Color(d.color).lerp(new THREE.Color('#f2f1dc'),.79);box(this.interior,d.x,.014,d.z,17.8,.016,9.8,new THREE.MeshStandardMaterial({color:c,roughness:1}));box(this.interior,d.x<0?-7.25:7.25,.015,d.z,1.4,.02,1.9,'#e6e8d4');}
    for(const wall of WALLS){box(this.interior,wall.x,.5,wall.z,wall.w,1,wall.d,'#eeeedf');box(this.interior,wall.x,1.03,wall.z,wall.w+.04,.09,wall.d+.04,'#fcfbef');}
    box(this.interior,0,.015,-16,13.6,.04,7.7,'#dfe8e3');box(this.interior,-4,.025,.2,5,.025,16,'#ebe4c9');box(this.interior,4,.025,.2,5,.025,16,'#dfebd8');box(this.interior,0,.03,13.6,12,.03,9,'#ece2d1');
    for(const desk of DESKS)this.desk(desk.x,desk.z);
    this.table(0,-16,7,2.5,.88);this.table(-4,-5,3,1.3,.78);this.table(-4,4,3,1.3,.78);this.table(-4,12,3,1.5,.8);
    box(this.interior,4,1.1,21.7,4,2.2,1.5,'#b1bea1');box(this.interior,4,2.25,21.7,4.15,.13,1.7,'#eee8d5');
    box(this.interior,4,.6,16,3,1.2,1.1,'#c7ac85');box(this.interior,4,1.25,16,3.1,.1,1.2,'#f4eddb');box(this.interior,3.3,1.6,16,.65,.7,.65,'#6e8478');box(this.interior,3.3,1.73,16.34,.4,.25,.035,'#c4dfc8');
    for(let i=-2;i<=2;i++){box(this.interior,i*1.1,.075,23.2,.8,.025,.2,'#9bb793');}
    box(this.exterior,0,1.8,-20,50,3.6,.3,'#ebeadd');for(const x of [-25,25])box(this.exterior,x,1.8,2,.3,3.6,44,'#e9e8d9');
    box(this.exterior,-14,1.8,24,22,3.6,.3,'#e5e5d2');box(this.exterior,14,1.8,24,22,3.6,.3,'#e5e5d2');
    const glass=mat('#adc7bf');for(const x of [-25.18,25.18])for(let z=-17;z<23;z+=4.5)box(this.exterior,x,2,z,.04,1.6,2.8,glass);
    for(let x=-22;x<23;x+=4.2){if(Math.abs(x)<4)continue;box(this.exterior,x,2,24.19,2.7,1.7,.04,glass);}
    box(this.exterior,0,3.66,2,50.8,.3,44.8,'#f6f4e8');box(this.exterior,0,3.87,2,48.8,.16,42.8,'#dbe2cd');
    for(const x of [-24.9,24.9])box(this.exterior,x,4.1,2,.3,.65,44.5,'#eeeadd');for(const z of [-20.3,24.3])box(this.exterior,0,4.1,z,50,.65,.3,'#eeeadd');
    box(this.exterior,0,3.4,26,8,.25,4.2,'#71967c');for(const x of [-3.7,3.7])box(this.exterior,x,1.65,27.6,.22,3.3,.22,'#d8decd');
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#dbe2cd';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#4d7c5e';ctx.font='600 140px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('HALYK',512,128);const label=new THREE.Mesh(new THREE.PlaneGeometry(17,4.25),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas)}));label.rotation.x=-Math.PI/2;label.position.set(0,3.97,3);this.exterior.add(label);
    for(const x of [-19,19])for(const z of [-14,17]){box(this.exterior,x,4,z,5,.4,3.5,'#b9c8a7');this.shrub(x,4.45,z,1.4,this.exterior);}
  }
  table(x,z,w,d,h=.82){box(this.interior,x,h,z,w,.13,d,'#c4966d');for(const dx of [-w/2+.15,w/2-.15])for(const dz of [-d/2+.14,d/2-.14])box(this.interior,x+dx,h/2,z+dz,.12,h,.12,'#ad855e');}
  desk(x,z){this.table(x,z,2.8,1.4,.84);box(this.interior,x,.96,z-.18,.55,.06,.35,'#859a91');box(this.interior,x,1.16,z-.3,.11,.4,.1,'#7d928a');box(this.interior,x,1.52,z-.34,1.1,.62,.085,'#596f67');box(this.interior,x,1.52,z-.288,.99,.51,.025,'#b9d8d0');box(this.interior,x,1.01,z+.22,.68,.035,.26,'#d7ded5');box(this.interior,x+.57,1.015,z+.25,.13,.07,.2,'#dee4d8');cylinder(this.interior,x-.96,1.07,z+.13,.1,.22,'#e9d3a2',8);}
  decorate(){
    DESKS.forEach((d,i)=>{this.asset(i%2?'chair_A':'chair_B',d.x,d.z+1.07,.9,Math.PI);if(i%3===0)this.asset('cactus_small_A',d.x+1,d.z-.35,.3,0,this.interior,.92);});
    for(const d of DEPARTMENTS){const outer=d.x<0?-23.7:23.7;this.asset('cabinet_medium_decorated',outer,d.z-3.8,1.35,d.x<0?Math.PI/2:-Math.PI/2);this.asset(d.x<0?'cactus_medium_A':'cactus_medium_B',outer,d.z+3.8,1.2);}
    for(const x of [-2.4,0,2.4]){this.asset('chair_A',x,-18.2,1.05);this.asset('chair_B',x,-13.8,1.05,Math.PI);}for(const z of [-5,4])for(const x of [-5,-3])this.asset('chair_A',x,z+1.1,.95,Math.PI);
    this.asset('couch_pillows',4,-4,1.1,Math.PI/2);this.asset('couch_pillows',4,4,1.1,-Math.PI/2);this.asset('table_low',4,0,.5);this.asset('book_set',4,0,.3,0,this.interior,.55);this.asset('lamp_standing',5.8,-.3,1.7);
    this.asset('armchair',-5.7,15.2,1.1,.5);this.asset('armchair',-2.3,15.2,1.1,-.5);this.asset('cactus_medium_A',-5.8,18.5,1.3);this.asset('cactus_medium_B',6,18.5,1.4);this.asset('lamp_table',5.4,21.7,.65,0,this.interior,2.35);
  }
  createAvatars(){
    const count=this.employees.length;this.avatarParts=[];const parts=[
      ['head',new THREE.SphereGeometry(.225,8,6),'skin'],['body',new THREE.BoxGeometry(.43,.48,.29),'shirt'],['waist',new THREE.BoxGeometry(.37,.13,.28),'pants'],['leftLeg',new THREE.BoxGeometry(.145,.43,.17),'pants'],['rightLeg',new THREE.BoxGeometry(.145,.43,.17),'pants'],['leftArm',new THREE.BoxGeometry(.13,.4,.14),'shirt'],['rightArm',new THREE.BoxGeometry(.13,.4,.14),'shirt'],['hair',new THREE.BoxGeometry(.43,.13,.37),'hair'],['hairBack',new THREE.BoxGeometry(.42,.26,.1),'hair'],['eyeL',new THREE.BoxGeometry(.035,.035,.025),'eye'],['eyeR',new THREE.BoxGeometry(.035,.035,.025),'eye'],['badge',new THREE.BoxGeometry(.075,.105,.017),'badge']
    ];
    for(const [name,geometry,colorKey] of parts){const material=new THREE.MeshStandardMaterial({roughness:.85});const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;mesh.userData.avatars=true;for(let i=0;i<count;i++)mesh.setColorAt(i,new THREE.Color(colorKey==='eye'?'#34352f':colorKey==='badge'?'#f0e6b5':this.employees[i].avatar[colorKey]));mesh.instanceColor.needsUpdate=true;this.scene.add(mesh);this.avatarParts.push({name,mesh});}
    this.rings=new THREE.InstancedMesh(new THREE.RingGeometry(.34,.42,24),new THREE.MeshBasicMaterial({color:'#63ba8a',side:THREE.DoubleSide,transparent:true,opacity:.75}),count);this.rings.frustumCulled=false;this.scene.add(this.rings);this.dummy=new THREE.Object3D();this.rootMatrix=new THREE.Matrix4();this.localMatrix=new THREE.Matrix4();
    this.selection=new THREE.Mesh(new THREE.RingGeometry(.44,.52,32),new THREE.MeshBasicMaterial({color:'#e0be56',side:THREE.DoubleSide}));this.selection.rotation.x=-Math.PI/2;this.selection.visible=false;this.scene.add(this.selection);
  }
  setActors(snapshot){for(const actor of snapshot.actors){this.latest.set(actor.id,actor);if(!this.positions.has(actor.id))this.positions.set(actor.id,{x:actor.x,z:actor.z,h:actor.h});}this.online=snapshot.online;}
  createLabels(){this.labels=[];const host=document.getElementById('world-labels');for(const room of [...DEPARTMENTS,...SERVICES]){const el=document.createElement('button');el.className=`room-label ${SERVICES.includes(room)?'service':''}`;el.textContent=room.title;el.dataset.room=room.id;el.addEventListener('click',()=>this.onMove?.(room.x,room.z,room));host.append(el);this.labels.push({el,room});}}
  setupInput(){
    let down=null;const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,button:e.button};});
    canvas.addEventListener('pointerup',e=>{if(!down||down.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;down=null;this.screenRay(e);const hits=this.raycaster.intersectObjects(this.avatarParts.map(p=>p.mesh),false);if(hits.length){const employee=this.employees[hits[0].instanceId];this.onInspect?.(employee);return;}if(this.raycaster.ray.intersectPlane(this.floorPlane,this.targetPoint))this.onMove?.(this.targetPoint.x,this.targetPoint.z);});
    let hoverAt=0;canvas.addEventListener('pointermove',e=>{if(e.buttons||performance.now()-hoverAt<90)return;hoverAt=performance.now();this.screenRay(e);const hits=this.raycaster.intersectObjects(this.avatarParts.filter(p=>['head','body'].includes(p.name)).map(p=>p.mesh),false);this.onHover?.(hits.length?this.employees[hits[0].instanceId]:null,e.clientX,e.clientY);});canvas.addEventListener('pointerleave',()=>this.onHover?.(null));
    this.controls.addEventListener('start',()=>{this.focusTarget=null;});
  }
  screenRay(e){const r=this.container.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;this.renderer.setSize(w,h);const aspect=w/h;this.camera.left=-35*aspect;this.camera.right=35*aspect;this.camera.top=35;this.camera.bottom=-35;this.camera.updateProjectionMatrix();}
  setMode(mode){this.mode=mode;this.exterior.visible=mode==='campus';this.interior.visible=mode==='office';for(const part of this.avatarParts)part.mesh.visible=mode==='office';this.rings.visible=mode==='office';document.getElementById('world-labels').style.display=mode==='office'?'':'none';if(mode==='campus')this.overview();}
  setControlled(id){this.activeId=id;}
  focus(x,z,zoom=2){this.focusTarget={x,z,zoom};}
  overview(){this.focus(0,2,this.container.clientWidth<800?.72:.88);}
  focusMe(){const p=this.positions.get(this.activeId);if(p)this.focus(p.x,p.z,2.6);}
  setPath(points){if(this.pathLine){this.scene.remove(this.pathLine);this.pathLine.geometry.dispose();this.pathLine.material.dispose();this.pathLine=null;}if(!points?.length)return;const positions=points.map(p=>new THREE.Vector3(p.x,.08,p.z));const geometry=new THREE.BufferGeometry().setFromPoints(positions);this.pathLine=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:'#759c52',dashSize:.24,gapSize:.18,transparent:true,opacity:.9}));this.pathLine.computeLineDistances();this.scene.add(this.pathLine);}
  movementVector(x,z){const forward=new THREE.Vector3();this.camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();const v=right.multiplyScalar(x).addScaledVector(forward,-z);return {x:v.x,z:v.z};}
  project(x,y,z){const p=new THREE.Vector3(x,y,z).project(this.camera);return {x:(p.x*.5+.5)*this.container.clientWidth,y:(-p.y*.5+.5)*this.container.clientHeight,visible:p.z>-1&&p.z<1};}
  updateAvatars(time,dt){
    const local={head:[0,1.16,0],body:[0,.78,0],waist:[0,.48,0],leftLeg:[-.105,.26,0],rightLeg:[.105,.26,0],leftArm:[-.29,.79,0],rightArm:[.29,.79,0],hair:[0,1.34,-.012],hairBack:[0,1.19,-.17],eyeL:[-.075,1.18,.2],eyeR:[.075,1.18,.2],badge:[.1,.85,.153]};
    for(let i=0;i<this.employees.length;i++){
      const e=this.employees[i],actor=this.latest.get(e.id),p=this.positions.get(e.id);if(!actor||!p)continue;
      const lerp=1-Math.exp(-dt*16);p.x+=(actor.x-p.x)*lerp;p.z+=(actor.z-p.z)*lerp;const delta=Math.atan2(Math.sin(actor.h-p.h),Math.cos(actor.h-p.h));p.h+=delta*lerp;
      this.dummy.position.set(p.x,.035,p.z);this.dummy.rotation.set(0,p.h,0);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.rootMatrix.copy(this.dummy.matrix);
      const walk=actor.moving?Math.sin(time*.011+i)*.5:0;
      for(const part of this.avatarParts){const [x,y,z]=local[part.name];this.dummy.position.set(x,y,z);this.dummy.rotation.set(0,0,0);this.dummy.scale.set(1,1,1);
        if(part.name==='leftLeg'||part.name==='rightArm')this.dummy.rotation.x=walk;if(part.name==='rightLeg'||part.name==='leftArm')this.dummy.rotation.x=-walk;
        if(part.name==='head')this.dummy.position.y+=Math.abs(walk)*.04;
        if(part.name==='hair'){this.dummy.scale.y=1+e.avatar.hairStyle*.7;this.dummy.position.y+=e.avatar.hairStyle*.035;}
        if(part.name==='hairBack')this.dummy.scale.y=e.avatar.hairStyle===3?1.7:.4;
        if(part.name==='badge')this.dummy.scale.setScalar(e.avatar.accessory===0?1:.001);
        this.dummy.updateMatrix();this.localMatrix.multiplyMatrices(this.rootMatrix,this.dummy.matrix);part.mesh.setMatrixAt(i,this.localMatrix);
      }
      this.dummy.position.set(p.x,.055,p.z);this.dummy.rotation.set(-Math.PI/2,0,0);this.dummy.scale.setScalar(actor.live?1:.001);this.dummy.updateMatrix();this.rings.setMatrixAt(i,this.dummy.matrix);
    }
    for(const part of this.avatarParts)part.mesh.instanceMatrix.needsUpdate=true;this.rings.instanceMatrix.needsUpdate=true;
    const me=this.positions.get(this.activeId);this.selection.visible=!!me&&this.mode==='office';if(me)this.selection.position.set(me.x,.065,me.z);
  }
  frame(time){const dt=Math.min(.05,(time-(this.lastTime||time-16))/1000);this.lastTime=time;
    if(this.focusTarget){const target=new THREE.Vector3(this.focusTarget.x,0,this.focusTarget.z),delta=target.clone().sub(this.controls.target).multiplyScalar(.085);this.controls.target.add(delta);this.camera.position.add(delta);this.camera.zoom+=(this.focusTarget.zoom-this.camera.zoom)*.075;this.camera.updateProjectionMatrix();if(delta.length()<.005&&Math.abs(this.camera.zoom-this.focusTarget.zoom)<.002)this.focusTarget=null;}
    this.controls.update();this.updateAvatars(time,dt);
    for(const {el,room} of this.labels){const p=this.project(room.x,1.7,room.z-3.7);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;el.hidden=!this.labelsVisible||!p.visible||this.camera.zoom>3;}
    if(this.activeId&&this.mode==='office'){const me=this.positions.get(this.activeId);if(me){const p=this.project(me.x,1.75,me.z);const el=document.getElementById('me-label');el.hidden=!p.visible;el.style.left=`${p.x}px`;el.style.top=`${p.y+this.container.getBoundingClientRect().top}px`;}}else document.getElementById('me-label').hidden=true;
    this.renderer.render(this.scene,this.camera);
  }
}

export function avatarIcon(avatar){
  const c=document.createElement('canvas');c.width=90;c.height=100;const g=c.getContext('2d');g.fillStyle=avatar.shirt;g.beginPath();g.roundRect(22,53,46,38,10);g.fill();g.fillStyle=avatar.pants;g.fillRect(30,87,12,13);g.fillRect(48,87,12,13);g.fillStyle=avatar.skin;g.beginPath();g.roundRect(25,18,40,39,15);g.fill();g.fillStyle=avatar.hair;g.beginPath();g.roundRect(24,13-avatar.hairStyle*2,42,19+avatar.hairStyle*2,[13,13,2,2]);g.fill();g.fillStyle='#30362c';g.fillRect(35,37,3,3);g.fillRect(53,37,3,3);if(avatar.accessory===0){g.fillStyle='#efe2ba';g.fillRect(52,64,7,10);}return c.toDataURL('image/png');
}
