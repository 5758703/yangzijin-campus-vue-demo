import { readFile, writeFile } from 'node:fs/promises'
const root = new URL('../', import.meta.url)
const raw = JSON.parse((await readFile(new URL('public/gis/osm-ways.json', root), 'utf8')).replace(/^\uFEFF/, ''))
const origin = [119.3947065, 32.34511705]
const project = ([lon, lat]) => [+( (lon-origin[0])*111319.49*Math.cos(origin[1]*Math.PI/180)).toFixed(3), +((lat-origin[1])*111319.49).toFixed(3)]
const closed = p => p.length>3 && p[0][0]===p.at(-1)[0] && p[0][1]===p.at(-1)[1]
const boundary = raw.ways.find(w=>w.id==='1032915225').coordinates.map(project)
const inside = ([x,y], ring=boundary) => {let odd=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i], [c,d]=ring[j]; if((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a)odd=!odd}return odd}
const ways = new Map(raw.ways.map(w=>[w.id,w]))
const candidates = raw.ways.map(w=>({...w,sourceType:'way',holes:[]}))
// Assemble relation rings, including the two Wenjin courtyard holes.
function joinRings(members){
  const parts=members.map(m=>ways.get(m.ref)?.coordinates).filter(Boolean).map(p=>[...p]), rings=[]
  const eq=(a,b)=>a[0]===b[0]&&a[1]===b[1]
  while(parts.length){let ring=parts.shift();let change=true;while(!closed(ring)&&change){change=false;for(let i=0;i<parts.length;i++){let p=parts[i];if(eq(ring.at(-1),p.at(-1)))p=[...p].reverse();if(eq(ring.at(-1),p[0])){ring.push(...p.slice(1));parts.splice(i,1);change=true;break}}}if(closed(ring))rings.push(ring)}return rings
}
for(const r of raw.relations||[]){if(r.tags.type!=='multipolygon')continue;const outer=joinRings(r.members.filter(m=>m.type==='way'&&m.role==='outer'));const holes=joinRings(r.members.filter(m=>m.type==='way'&&m.role==='inner'));for(let i=0;i<outer.length;i++)candidates.push({id:r.id+(i?`-${i}`:''),tags:r.tags,coordinates:outer[i],holes,sourceType:'relation'})}
const features=[]
for(const w of candidates){
  if(!w.coordinates?.length || w.coordinates.some(p=>!p))continue
  const points=w.coordinates.map(project), t=w.tags
  if(!points.some(p=>inside(p)) && w.id!=='1032915225')continue
  let kind=t.building?'building':t.natural==='water'?'water':t.waterway?'waterway':t.leisure==='track'?'track':t.leisure==='pitch'?'pitch':t.highway?'road':t.landuse==='grass'||t.natural==='wood'||t.natural==='scrub'||t.leisure==='garden'?'green':t.natural==='tree_row'?'trees':w.id==='1032915225'?'boundary':null
  if(!kind)continue
  if(['building','water','pitch','green','boundary'].includes(kind)&&!closed(w.coordinates))continue
  const center=points.slice(0,closed(w.coordinates)?-1:undefined).reduce((s,p)=>[s[0]+p[0],s[1]+p[1]],[0,0]).map(v=>v/(points.length-(closed(w.coordinates)?1:0)))
  if(kind==='building'&&!inside(center))continue
  features.push({id:`${w.sourceType}/${w.id}`,osmId:w.id,sourceType:w.sourceType,tags:t,kind,points,holes:w.holes.map(h=>h.map(project)),center})
}
const landmarks={'昭文馆':{height:42,photo:'zhaowen.jpg',kind:'library',note:'照片参考：帆形墙面与玻璃中庭；体量高度为演示估算。'},'文津楼':{height:26,photo:'wenjin.jpg',kind:'wenjin',note:'保留 OSM 外轮廓和两处内院；入口架空体量按照片示意。'},'笃行楼':{height:25,photo:'duxing.jpg',kind:'duxing',note:'弧形玻璃立面参考照片；细部尺寸为示意。'},'津园':{height:13,photo:'jinyuan.jpg',kind:'dining',note:'提供的图片是室内用餐区；外立面仅按 OSM 轮廓作示意。'},'润园':{height:9,kind:'dining'},'文体馆':{height:18,kind:'sport'}}
const buildings=features.filter(f=>f.kind==='building').map((f,i)=>{
 const t=f.tags, l=landmarks[t.name], height=Number.parseFloat(t.height)||l?.height||(Number(t['building:levels'])?Number(t['building:levels'])*3.4: /dormitory|apartments/.test(t.building)?20:/college|university/.test(t.building)?24:8)
 const xs=f.points.map(p=>p[0]), ys=f.points.map(p=>p[1]), x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2
 return {buildingId:`B${f.osmId}`,osmFeatureId:f.id,name:t.name||`未命名${t.building==='dormitory'?'宿舍':'建筑'} · ${f.osmId.slice(-4)}`,named:!!t.name,centerGround:{x,y,z:0},size:{width:+(Math.max(...xs)-Math.min(...xs)).toFixed(1),depth:+(Math.max(...ys)-Math.min(...ys)).toFixed(1),height},category:l?.kind==='dining'?'餐饮':t.building==='dormitory'||t.building==='apartments'?'生活':l?.kind==='sport'?'体育':l?.kind==='library'?'图书':'教学及配套',landmark:!!l,modelKind:l?.kind||'standard',photo:l?.photo||null,note:l?.note||'平面轮廓来自 OSM；立面为程序化示意。',heightSource:t.height?'OSM height':t['building:levels']?'OSM 楼层数 × 3.4 米':'演示估算',footprint:f.points,holes:f.holes}
}).sort((a,b)=>Number(b.landmark)-Number(a.landmark)||a.name.localeCompare(b.name,'zh-CN'))
const alarm=buildings.find(b=>b.name==='文津楼').buildingId
const frames=[0,1,2].map((step)=>({simulatedAt:`2026-09-20T09:${['00','05','10'][step]}:00+08:00`,buildings:buildings.map((b,i)=>({buildingId:b.buildingId,powerKw:Math.round((b.size.width*b.size.depth/220+12)*(1+step*.08+(i%3)*.1)),temperatureC:b.buildingId===alarm?[26.8,32.4,27.1][step]:+(24.2+i%5+step*.3).toFixed(1),occupants:Math.round((b.size.width*b.size.depth/12)*(1+step*.1))}))}))
const routes=features.filter(f=>f.kind==='road'&&!f.tags.area&&f.points.length>2&&f.points.every(p=>inside(p))&&['footway','pedestrian','service','residential'].includes(f.tags.highway)).sort((a,b)=>Number(!!b.tags.name)-Number(!!a.tags.name)).slice(0,10).map(f=>({id:f.id,points:[...f.points,...f.points.slice(1,-1).reverse()].map(([x,y])=>[x,-y])}))
const northArc=features.find(f=>f.osmId==='1033125791'), southArc=features.find(f=>f.osmId==='1033125792')
const track={id:'OSM east track arcs 1033125791 + 1033125792',points:[...northArc.points,...[...southArc.points].reverse()]}
const geojson={type:'FeatureCollection',name:'扬州大学扬子津校区 — OSM 校区范围摘录',attribution:raw.copyright,license:raw.license,features:features.map(f=>({type:'Feature',id:f.id,properties:{...f.tags,source:'OpenStreetMap',osm_id:f.id,kind:f.kind},geometry:{type:closed(f.points)?'Polygon':'LineString',coordinates:closed(f.points)?[candidates.find(w=>`${w.sourceType}/${w.id}`===f.id).coordinates,...candidates.find(w=>`${w.sourceType}/${w.id}`===f.id).holes]:candidates.find(w=>`${w.sourceType}/${w.id}`===f.id).coordinates}}))}
const data={description:'扬子津校区 OSM 平面矢量 + 照片参考示意建模 + 人工模拟运行数据',isSimulated:true,source:{...raw,ways:undefined,relations:undefined,origin,crs:'WGS84 / EPSG:4326',projection:'局部等距近似：经度差 × cos(原点纬度) × 111319.49；纬度差 × 111319.49。单位米；非测绘级。',osmCampusId:'way/1032915225',featureCount:features.length},layout:{unit:'meter',campusSize:{eastWest:1182,northSouth:1141},boundary,buildings,features},routes,track:track?.points.map(([x,y])=>[x,-y]),frames,alarmRule:{buildingId:alarm,metric:'temperatureC',threshold:32},playback:{wallClockIntervalSeconds:5}}
await writeFile(new URL('src/data/campus.json',root),JSON.stringify(data))
await writeFile(new URL('public/gis/campus.geojson',root),JSON.stringify(geojson))
console.log(JSON.stringify({buildings:buildings.length,features:features.length,routes:routes.length,track:track?.id,landmarks:buildings.filter(b=>b.landmark).map(b=>b.name)},null,2))
