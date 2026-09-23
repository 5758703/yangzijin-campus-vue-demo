import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createPeoplePlan, sampleRoute, shouldAnimatePeople } from '../src/scene/gisPeople.js'
import { getSnapshot, nextFrame, findBuildingId } from '../src/domain/simulation.js'
const data=JSON.parse(await readFile(new URL('../src/data/campus.json',import.meta.url),'utf8'))
const geo=JSON.parse(await readFile(new URL('../public/gis/campus.geojson',import.meta.url),'utf8'))
test('GIS attribution, WGS84 coordinates and unique building IDs survive conversion',()=>{
 assert.equal(data.source.osmCampusId,'way/1032915225');assert.equal(data.source.license,'ODbL 1.0')
 assert.equal(new Set(data.layout.buildings.map(b=>b.buildingId)).size,data.layout.buildings.length)
 assert.ok(data.layout.buildings.length>80)
 for(const f of geo.features){const p=f.geometry.type==='Polygon'?f.geometry.coordinates[0][0]:f.geometry.coordinates[0];assert.ok(p[0]>119&&p[0]<120&&p[1]>32&&p[1]<33)}
})
test('Wenjin relation preserves both courtyards; named landmarks have reference metadata',()=>{
 const w=data.layout.buildings.find(b=>b.name==='文津楼');assert.equal(w.osmFeatureId,'relation/13817766');assert.equal(w.holes.length,2)
 for(const name of ['昭文馆','笃行楼','津园','文津楼'])assert.ok(data.layout.buildings.find(b=>b.name===name).photo)
 assert.equal(geo.features.find(f=>f.id==='relation/13817766').geometry.coordinates.length,3)
})
test('snapshots contain every building; totals agree; alarm clears on backwards and recovery seeking',()=>{
 for(let i=0;i<3;i++){const s=getSnapshot(data,i);assert.equal(s.buildings.length,data.layout.buildings.length);assert.equal(s.totalPower,s.buildings.reduce((sum,b)=>sum+b.powerKw,0))}
 assert.equal(getSnapshot(data,1).alarms[0].name,'文津楼');assert.equal(getSnapshot(data,0).alarms.length,0);assert.equal(getSnapshot(data,2).alarms.length,0)
 assert.throws(()=>getSnapshot(data,-1),RangeError)
})
test('crowd density retains teachers and track runners using GIS paths',()=>{
 for(const [density,count] of [['low',10],['medium',24],['high',42]])assert.equal(createPeoplePlan(density).length,count)
 const p=createPeoplePlan();assert.equal(p.filter(p=>p.role==='teacher').length,4);assert.equal(p.filter(p=>p.motion==='jog').length,4)
 for(const actor of p){assert.ok(actor.route.length>2);assert.ok(actor.speed>0);assert.equal(actor.role==='teacher'&&actor.motion==='jog',false);assert.deepEqual(sampleRoute(actor.route,0),sampleRoute(actor.route,1));const a=sampleRoute(actor.route,.25),b=sampleRoute(actor.route,.26);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>0)}
})
test('motion respects page visibility and reduced motion; building picking walks ancestors',()=>{
 assert.equal(shouldAnimatePeople({enabled:true,hidden:false,reducedMotion:false}),true)
 for(const state of [{enabled:false},{enabled:true,hidden:true},{enabled:true,reducedMotion:true}])assert.equal(shouldAnimatePeople(state),false)
 assert.equal(findBuildingId({parent:{userData:{buildingId:'B1032897386'}}}),'B1032897386');assert.equal(findBuildingId({userData:{personId:'student-1'}}),null)
 assert.deepEqual(nextFrame(2,3),{index:2,ended:true})
})
test('delivered GLB contains all GIS building IDs and finite geometry data',async()=>{
 const glb=await readFile(new URL('../public/models/campus.glb',import.meta.url));assert.equal(glb.toString('utf8',0,4),'glTF');const length=glb.readUInt32LE(12);const json=JSON.parse(glb.toString('utf8',20,20+length));const ids=new Set(json.nodes.filter(n=>n.extras?.buildingId).map(n=>n.extras.buildingId))
 for(const b of data.layout.buildings)assert.ok(ids.has(b.buildingId),b.name)
 for(const a of json.accessors)for(const v of [...(a.min||[]),...(a.max||[])])assert.ok(Number.isFinite(v))
})
