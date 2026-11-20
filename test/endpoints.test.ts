import { expect, it } from 'vitest'
import { endpoint } from '../src/endpoints.js'
import { RoutingState, type SessionState } from '../src/state.js'
function fixture(){
 const disk=new Map<string,SessionState>();const state=new RoutingState({get:id=>disk.get(id),set:(id,value)=>{disk.set(id,value)}})
 const agents=[{id:'S1'},{id:'S2'},{id:'child',origin:'subagent'}]
 for(const agent of agents.slice(0,2)) state.setMode(agent.id,'AUTO')
 return {disk,state,resolve:async(id:string)=>agents.find(a=>a.id===id)}
}
it('spec Scenario "Invalid sessions are rejected without side effects"',async()=>{
 const {disk,state,resolve}=fixture();const before=JSON.stringify([...disk])
 for(const body of [{mode:'MANUAL'},{sessionId:42,mode:'MANUAL'},{sessionId:'unknown',mode:'MANUAL'},{sessionId:'child',mode:'MANUAL'},{sessionId:'S1',mode:'bad'}]) {
  const response=await endpoint('setMode',body,resolve,state)
  expect(response.status).toBeGreaterThanOrEqual(400);expect(response.status).toBeLessThan(500)
  expect(JSON.stringify([...disk])).toBe(before)
 }
 expect(state.read('S1').mode).toBe('AUTO')
})
it('spec Scenario "Only the target session is modified"',async()=>{
 const {state,resolve}=fixture();const before=state.read('S2')
 expect((await endpoint('setMode',{sessionId:'S1',mode:'MANUAL'},resolve,state)).status).toBe(200)
 expect(state.read('S1')).toEqual({mode:'MANUAL'})
 expect(state.read('S2')).toEqual(before)
 state.disable('S1','rate-limited',5)
 expect(await (await endpoint('state',{sessionId:'S1'},resolve,state)).json()).toMatchObject({disabled:{category:'rate-limited',at:5}})
 await endpoint('setMode',{sessionId:'S1',mode:'AUTO'},resolve,state)
 expect((await (await endpoint('state',{sessionId:'S1'},resolve,state)).json()).disabled).toBeUndefined()
 expect(state.read('S2')).toEqual(before)
})
