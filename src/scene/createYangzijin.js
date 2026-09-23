import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// GIS XY: east/north metres; Three.js: X east, Y up, Z south.
export function createCampus(layout) {
  const campus=new THREE.Group(); campus.name='YZU_Yangzijin'
  campus.userData={source:'OpenStreetMap contributors / ODbL',height:'estimated unless tagged',units:'metres'}
  const palette={base:0xc4d5d9,lawn:0xd0dec0,green:0xb4ceaa,road:0xc7cdd0,path:0xe5e4d9,water:0x81b8c8,wall:0xf0eee3,roof:0xb9c5c5,glass:0x538596,trim:0xd3d9d4,brick:0xb38c78,track:0xc78978,field:0x91b69b,paint:0xf6f1df,leaf:0x729f83,trunk:0xa09075}
  const mats=Object.fromEntries(Object.entries(palette).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:k==='glass'||k==='water'?.32:.86,metalness:k==='glass'?.25:0,side:THREE.DoubleSide})]))
  function bucket(group){
    const bins=new Map()
    function add(geo,key,x=0,y=0,z=0,rot=0){geo.rotateY(rot);geo.translate(x,y,z);let flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();if(!flat.attributes.uv)flat.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(flat.attributes.position.count*2),2));if(!bins.has(key))bins.set(key,[]);bins.get(key).push(flat)}
    function box(x,y,z,w,h,d,key,rot=0){add(new THREE.BoxGeometry(w,h,d),key,x,y,z,rot)}
    function flush(){for(const [key,geos] of bins){const merged=mergeGeometries(geos);geos.forEach(g=>g.dispose());const mesh=new THREE.Mesh(merged,mats[key]);mesh.name=group.name+'_'+key;group.add(mesh)}}
    return {add,box,flush}
  }
  function polygon(points,holes=[],depth=0){const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));for(const hole of holes)shape.holes.push(new THREE.Path(hole.map(([x,y])=>new THREE.Vector2(x,y))));const g=depth?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1}):new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);return g}
  function line(b,points,width,key,y=.32){for(let i=1;i<points.length;i++){const [x1,n1]=points[i-1],[x2,n2]=points[i],len=Math.hypot(x2-x1,n2-n1);if(len<.01)continue;b.box((x1+x2)/2,y,-(n1+n2)/2,width,.12,len,key,Math.atan2(x2-x1,-(n2-n1)))}}
  const ground=new THREE.Group();ground.name='GIS_Terrain';campus.add(ground);const g=bucket(ground)
  g.add(polygon(layout.boundary,[],5),'base',0,-5.1)
  g.add(polygon(layout.boundary),'lawn',0,.02)
  for(const f of layout.features){
    if(f.kind==='green')g.add(polygon(f.points,f.holes),'green',0,.10)
    if(f.kind==='water')g.add(polygon(f.points,f.holes),'water',0,.16)
    if(f.kind==='waterway')line(g,f.points,9,'water',.16)
    if(f.kind==='pitch'){
      g.add(polygon(f.points),'field',0,.22);line(g,f.points,.55,'paint',.31)
      const xs=f.points.map(p=>p[0]),ys=f.points.map(p=>p[1]);const w=Math.max(...xs)-Math.min(...xs),d=Math.max(...ys)-Math.min(...ys)
      if(w>30&&d>50){g.box(f.center[0],.31,-f.center[1],w*.8,.08,.5,'paint');const c=new THREE.TorusGeometry(8,.25,4,40);c.rotateX(-Math.PI/2);g.add(c,'paint',f.center[0],.34,-f.center[1])}
    }
    if(f.kind==='track'){line(g,f.points,8,'track',.25);line(g,f.points,.26,'paint',.36)}
    if(f.kind==='road'){
      if(f.tags.area==='yes'&&f.points.length>3)g.add(polygon(f.points,f.holes),'path',0,.22)
      else {const width=/footway|path|steps/.test(f.tags.highway)?3.2:f.tags.highway==='pedestrian'?6:10;line(g,f.points,width,width<7?'path':'road',.32);if(f.tags.bridge)line(g,f.points,width,'path',.45)}
    }
  }
  g.flush()
  for(const spec of layout.buildings){
    const building=new THREE.Group();building.name=spec.buildingId;building.userData={buildingId:spec.buildingId,displayName:spec.name,osmFeatureId:spec.osmFeatureId,heightSource:spec.heightSource};campus.add(building)
    const b=bucket(building),h=spec.size.height,{x,y}=spec.centerGround,w=spec.size.width,d=spec.size.depth
    b.add(polygon(spec.footprint,spec.holes,h*(spec.modelKind==='library'?.32:1)),spec.category==='生活'?'brick':'wall',0,.4)
    if(spec.modelKind!=='library')b.add(polygon(spec.footprint,spec.holes),'roof',0,h+.45)
    for(const ring of [spec.footprint,...spec.holes])for(let i=1;i<ring.length;i++){
      const [a,c]=ring[i-1],[e,f]=ring[i],len=Math.hypot(e-a,f-c);if(len<5)continue
      const steps=Math.floor(len/5),rot=Math.atan2(f-c,e-a)
      for(let level=0;level<Math.floor((spec.modelKind==='library'?h*.3:h)/4);level++)for(let j=0;j<steps;j++){
        const t=(j+.5)/steps;b.box(a+(e-a)*t,2.5+level*4,-(c+(f-c)*t),2.7,2.3,.25,'glass',rot)
      }
    }
    if(spec.modelKind==='library'){
      function sail(offset,width,peak,depth){const s=new THREE.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(width*.3,peak);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});b.add(geo,'wall',x+offset,2,-y-depth/2)}
      sail(-w*.16,w*.63,h,d*.72);sail(w*.29,w*.27,h*.96,d*.68)
      b.box(x+w*.15,h*.48,-y+d*.18,w*.09,h*.83,d*.58,'glass')
      for(let k=1;k<8;k++)b.box(x+w*.15,k*h*.105,-y+d*.47,w*.10,.4,.45,'trim')
    }
    if(spec.modelKind==='wenjin'){
      b.box(x,8,-y+d*.50,w*.40,9,15,'wall')
      for(const dx of [-w*.16,w*.16])b.box(x+dx,3.7,-y+d*.52,2.2,7.4,3,'trim',dx>0?-.2:.2)
      b.box(x,2.6,-y+d*.48,w*.32,4.2,.4,'glass')
    }
    if(spec.modelKind==='duxing'){
      const curve=new THREE.CylinderGeometry(w*.20,w*.16,h*.82,32,1,true,-Math.PI*.48,Math.PI*.96)
      b.add(curve,'glass',x,h*.48,-y+d*.39)
      for(let a=-1.4;a<1.45;a+=.17)b.box(x+Math.sin(a)*w*.205,h*.48,-y+d*.39+Math.cos(a)*w*.205,.6,h*.85,.6,'trim')
      b.add(new THREE.CylinderGeometry(w*.215,w*.215,1,32,1,false,-Math.PI*.48,Math.PI*.96),'roof',x,h*.92,-y+d*.39)
    }
    b.flush()
  }
  const trees=new THREE.Group();trees.name='Trees';trees.userData.layer='trees';campus.add(trees);const n=bucket(trees)
  let count=0
  function tree(x,y){const height=5.7+(count++%4)*.7;n.add(new THREE.CylinderGeometry(.35,.55,height*.65,5),'trunk',x,height*.32,-y);const crown=new THREE.IcosahedronGeometry(height*.46,1);crown.scale(.85,1.2,.85);n.add(crown,'leaf',x,height*.87,-y)}
  for(const f of layout.features.filter(f=>f.kind==='trees'))for(let i=1;i<f.points.length;i++){const a=f.points[i-1],z=f.points[i],len=Math.hypot(z[0]-a[0],z[1]-a[1]);for(let t=0;t<len;t+=12)tree(a[0]+(z[0]-a[0])*t/len,a[1]+(z[1]-a[1])*t/len)}
  for(const f of layout.features.filter(f=>f.kind==='green'))if(f.points.length>4)tree(f.center[0],f.center[1])
  n.flush();return campus
}
