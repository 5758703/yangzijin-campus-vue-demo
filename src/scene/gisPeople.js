import data from '../data/campus.json' with { type: 'json' }
export { sampleRoute, shouldAnimatePeople } from './peopleMovement.js'
export function createPeoplePlan(density='medium') {
  const [students,teachers,runners]=({low:[8,2,2],medium:[20,4,4],high:[36,6,8]})[density]||[20,4,4]
  const actors=[]
  for(let i=0;i<students+teachers;i++){
    const teacher=i>=students,run=!teacher&&i<runners
    const route=run?data.track:data.routes[i%data.routes.length].points
    const length=route.reduce((s,p,j)=>s+Math.hypot(p[0]-route[(j+1)%route.length][0],p[1]-route[(j+1)%route.length][1]),0)
    actors.push({id:`${teacher?'teacher':'student'}-${i}`,role:teacher?'teacher':'student',motion:run?'jog':'walk',route,routeName:run?'track':data.routes[i%data.routes.length].id,phase:(i*.137)%1,speed:(run?2.8:teacher?1.1:1.4)/length,palette:i%5})
  }
  return actors
}
