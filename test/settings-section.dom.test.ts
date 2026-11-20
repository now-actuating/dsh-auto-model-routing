// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createElement as h, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RoutingSettings } from '../src/client/settings-section.js'
import { ui, view } from './gui-fixture.js'
import { resolvePreset } from '../src/presets/index.js'
const questions = resolvePreset('reasoning-depth').rubric
import { registry } from '../src/strategies/index.js'
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
let root: Root, host: HTMLElement
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(() => { act(() => root.unmount()); host.remove() })
const click = async (text: string) => { const button = Array.from(document.querySelectorAll(document.querySelector('[role=menu]') ? '[role=menu] button' : 'button')).find(b => b.textContent === text) as HTMLButtonElement | undefined; expect(button).toBeDefined(); await act(async () => button!.click()) }
const clickLabel = async (label: string) => { await act(async () => (host.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement).click()) }
it('ordinary settings save a sparse patch and never select a session model', async () => {
  const calls: { endpoint: string; payload: any }[] = []
  const rpc = { call: async (_: string, endpoint: string, payload: any) => { calls.push({ endpoint, payload }); return { ok: true, value: view() } } }
  await act(async () => root.render(h(RoutingSettings, { rpc, ui })))
  expect(host.querySelectorAll('[data-tier]')).toHaveLength(0)
  expect(host.querySelector('[role=tablist]')).toBeNull()
  await click('AUTO'); await click('Save')
  expect(calls.find(c => c.endpoint.endsWith('saveSettings'))?.payload).toEqual({ defaultMode: 'AUTO' })
  expect(calls.every(c => /^auto-model-routing\.(settings|saveSettings|setKey|decisionModels)$/.test(c.endpoint))).toBe(true)
})
it('connection button shows pending and local success or failure feedback',async()=>{
 let finish:((value:any)=>void)|undefined
 const rpc={call:async(_:string,endpoint:string)=>endpoint.endsWith('testDecision')?new Promise<any>(resolve=>{finish=resolve}):({ok:true,value:view()})}
 await act(async()=>root.render(h(RoutingSettings,{rpc,ui})))
 await click('Test connection')
 expect(host.querySelector('.amr-test-button')?.textContent).toBe('Testing…')
 expect((host.querySelector('.amr-test-button') as HTMLButtonElement).disabled).toBe(true)
 await act(async()=>finish!({ok:true,value:{kind:'ok',ms:123}}))
 expect(host.querySelector('.amr-test-row')?.textContent).toContain('Connection succeeded · 123 ms')
 await click('Test connection');await act(async()=>finish!({ok:true,value:{kind:'failed',category:'missing-credential'}}))
 expect(host.querySelector('.amr-test-row')?.textContent).toContain('No API key configured for the selected decision service')
})
it('service selection clears key drafts and waits for save before key management',async()=>{
 const calls:{endpoint:string;payload:any}[]=[]
 const rpc={call:async(_:string,endpoint:string,payload:any)=>{calls.push({endpoint,payload});const data=view();if(endpoint.endsWith('saveSettings'))data.settings={...data.settings,...payload};return {ok:true,value:data}}}
 await act(async()=>root.render(h(RoutingSettings,{rpc,ui})))
 expect(host.querySelector('select')).toBeNull()
 await clickLabel('Decision service'); await click('TypeSafe official')
 expect(host.textContent).toContain('key is not reused')
 expect(host.querySelector('input[type="password"]')?.hasAttribute('disabled')).toBe(true)
 await click('Save')
 expect(calls.find(c=>c.endpoint.endsWith('saveSettings'))?.payload).toEqual({decisionService:{provider:'typesafe'}})
 expect(calls.some(c=>c.endpoint.endsWith('setKey'))).toBe(false)
})
it('preset model menu selects version while custom service keeps model input',async()=>{
 await act(async()=>root.render(h(RoutingSettings,{rpc:{call:async()=>({ok:true,value:view()})},ui})))
 expect(host.querySelector('input[aria-label="Decision model"]')).toBeNull()
 await clickLabel('Decision service');await click('TypeSafe official')
 await clickLabel('Decision model');await click('jev-1.14.0')
 expect(host.querySelector('button[aria-label="Decision model"]')?.textContent).toBe('jev-1.14.0')
 await clickLabel('Decision service');await click('Custom System One')
 expect(host.querySelector('input[aria-label="Decision model"]')).not.toBeNull()
})
it('spec Scenario "Old mapping settings do not affect routing and are removed on save" (settings page notice)', async () => {
  const withDeprecated={...view(),deprecated:['childRoutes','mainEfforts','policy']}
  await act(async()=>root.render(h(RoutingSettings,{rpc:{call:async()=>({ok:true,value:withDeprecated})},ui})))
  expect(host.querySelector('[role=status][data-deprecated]')?.textContent).toMatch(/no longer apply/)
  expect(host.textContent).toMatch(/removed on the next save/)
  expect(host.querySelectorAll('[data-tier]')).toHaveLength(0)
  expect(host.querySelector('[role=tablist]')).toBeNull()
  act(()=>root.unmount()); root=createRoot(host)
  await act(async()=>root.render(h(RoutingSettings,{rpc:{call:async()=>({ok:true,value:{...view(),deprecated:[]}})},ui})))
  expect(host.querySelector('[data-deprecated]')).toBeNull()
})
it('spec Scenario "Select and save a judgement preset"',async()=>{
  const calls:{endpoint:string;payload:any}[]=[]
  const data={...view(),settings:{...view().settings,decisionToast:false}}
  await act(async()=>root.render(h(RoutingSettings,{rpc:{call:async(_:string,endpoint:string,payload:any)=>{calls.push({endpoint,payload});return {ok:true,value:data}}},ui})))
  const eav=resolvePreset('effort-as-verification'),rd=resolvePreset('reasoning-depth')
  expect(host.querySelector('[aria-label="Judgement preset"]')?.textContent).toContain(rd.title)
  await clickLabel('Judgement preset')
  const items=Array.from(document.querySelectorAll('[role=menu] button')).map(b=>b.textContent)
  expect(items).toEqual([`${rd.title} · default`,eav.title])
  await click(eav.title)
  expect(host.querySelector('[aria-label="Judgement preset"]')?.textContent).toContain(eav.title)
  expect(host.textContent).toContain(eav.summary)
  await click('Save')
  expect(calls.find(c=>c.endpoint.endsWith('saveSettings'))?.payload).toEqual({preset:'effort-as-verification'})
})
it('spec Scenario "The policy description comes from rubric files and the registry"',async()=>{
  const calls:string[]=[]
  const data={...view(),settings:{...view().settings,preset:'effort-as-verification'}}
  const eav=resolvePreset('effort-as-verification')
  const presetRubric=eav.rubric
  await act(async()=>root.render(h(RoutingSettings,{rpc:{call:async(_,endpoint)=>{calls.push(endpoint);return {ok:true,value:data}}},ui})))
  const details=host.querySelector('details')!
  expect(details.open).toBe(false)
  expect(details.querySelector('summary')?.textContent).toBe('View the decision policy')
  expect(details.textContent).toContain(eav.title)
  expect(details.textContent).toContain(eav.evidence)
  const link=details.querySelector(`a[href="${eav.sources[0]!.url}"]`) as HTMLAnchorElement
  expect(link).not.toBeNull()
  expect(link.target).toBe('_blank')
  expect(link.rel).toBe('noopener noreferrer')
  expect(details.textContent).not.toContain(questions.depth.criteria.higher)
  for(const q of Object.values(presetRubric)){
    expect(details.textContent).toContain(q.instructions)
    for(const text of Object.values(q.criteria))expect(details.textContent).toContain(text)
  }
  for(const s of registry.strategies){expect(details.textContent).toContain(s.label);for(const model of Object.values(s.childModels))expect(details.textContent).toContain(model)}
  expect(host.querySelectorAll('[data-tier]')).toHaveLength(0)
  expect(host.querySelector('[role=tablist]')).toBeNull()
  details.open=true;details.dispatchEvent(new Event('toggle'))
  expect(details.open).toBe(true)
  expect(calls).toEqual(['auto-model-routing.settings','auto-model-routing.decisionModels'])
  expect((Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Save') as HTMLButtonElement).disabled).toBe(true)
})
it('spec Scenario "Save results are independent and do not expose secrets"', async () => {
  const rpc = { call: async (_: string, endpoint: string) => endpoint.endsWith('saveSettings') ? { ok: false, error: { message: 'invalid' } } : { ok: true, value: view() } }
  await act(async () => root.render(h(RoutingSettings, { rpc, ui })))
  const input = host.querySelector('input[type=password]') as HTMLInputElement
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'example-test-value'); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })) })
  await click('AUTO'); await click('Save')
  expect(input.value).toBe('')
  expect(host.textContent).toContain('API key saved')
  expect(host.textContent).toContain('Settings were not saved')
  expect(Array.from(host.querySelectorAll('[aria-pressed=true]')).some(el => el.textContent === 'AUTO')).toBe(true)
})
it('unavailable child service and readonly environment key still allow unrelated settings save', async () => {
  const data = view(); data.key.writable = false; data.key.source = 'environment'; data.childAllowlist.status = 'unavailable' as never
  const calls: string[] = []
  const rpc = { call: async (_: string, endpoint: string) => { calls.push(endpoint); return { ok: true, value: data } } }
  await act(async () => root.render(h(RoutingSettings, { rpc, ui })))
  expect((host.querySelector('input[type=password]') as HTMLInputElement).disabled).toBe(true)
  expect(host.textContent).toContain('restart')
  await click('AUTO'); await click('Save')
  expect(calls).toContain('auto-model-routing.saveSettings')
})

it('OpenRouter model menu is filled from the Host free-model query on load and refreshed on open',async()=>{
 const calls:{endpoint:string;payload:any}[]=[]
 let models=[{id:'perplexity/pplx-decider-v1.3:free',name:'P'}]
 const rpc={call:async(_:string,endpoint:string,payload:any)=>{calls.push({endpoint,payload});if(endpoint.endsWith('decisionModels'))return {ok:true,value:{status:'ok',models,fetchedAt:1}};return {ok:true,value:view()}}}
 await act(async()=>root.render(h(RoutingSettings,{rpc,ui})))
 expect(calls.filter(c=>c.endpoint.endsWith('decisionModels')).map(c=>c.payload)).toEqual([{refresh:false}])
 models=[...models,{id:'respan/span-01-lite:free',name:'R'}]
 await clickLabel('Decision model')
 expect(calls.filter(c=>c.endpoint.endsWith('decisionModels')).map(c=>c.payload)).toEqual([{refresh:false},{refresh:true}])
 const labels=Array.from(document.querySelectorAll('[role=menu] button')).map(b=>b.textContent)
 expect(labels).toEqual(['perplexity/pplx-decider-v1.3:free','respan/span-01-lite:free','typesafe/jev-1.13 · not in the free list'])
 await click('respan/span-01-lite:free'); await click('Save')
 expect(calls.find(c=>c.endpoint.endsWith('saveSettings'))?.payload).toEqual({decisionService:{provider:'openrouter',model:'respan/span-01-lite:free'}})
})
it('OpenRouter model menu reports a failed live query without inventing models',async()=>{
 const rpc={call:async(_:string,endpoint:string)=>endpoint.endsWith('decisionModels')?{ok:true,value:{status:'failed',reason:'timeout',fetchedAt:1}}:{ok:true,value:view()}}
 await act(async()=>root.render(h(RoutingSettings,{rpc,ui})))
 await clickLabel('Decision model')
 expect(Array.from(document.querySelectorAll('[role=menu] button')).map(b=>b.textContent)).toEqual(['typesafe/jev-1.13 · not in the free list','Could not load the model list; reopen to retry'])
})
