import { fakeLocale } from './fake-locale.js'
import { expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RoutingChip, apply } from '../src/client/index.js'
import { callRouting, chipOrder, panelOpenAfter, toastText, nextToast } from '../src/client/control.js'
it('spec Scenario "The chip is registered to the left of the speed chip"',()=>{
 expect(chipOrder).toBeLessThan(0)
 const registrations: {name:string;order:number}[] = []
 const ctx={effect:(callback:()=>unknown)=>callback(),locale:fakeLocale('zh').service,slots:{inject:(_name:string,callback:()=>void)=>callback(),register:(options:{name:string;order:number})=>{registrations.push(options);return ()=>{}}}}
 apply(ctx as never)
 expect(registrations).toContainEqual(expect.objectContaining({name:'conversation.input.right',order:-10}))
 expect(registrations).toContainEqual(expect.objectContaining({name:'settings.section',order:300}))
})
it('spec Scenario "Switching modes only calls the plugin endpoint"',async()=>{
 const calls:unknown[][]=[]
 const rpc={call:async(...args:unknown[])=>{calls.push(args);return {ok:true,value:{mode:'AUTO'}}}}
 expect(await callRouting(rpc,'S','AUTO')).toEqual({mode:'AUTO'})
 expect(calls).toEqual([['/api','auto-model-routing.setMode',{sessionId:'S',mode:'AUTO'}]])
 await callRouting(rpc,'S')
 expect(calls[1]).toEqual(['/api','auto-model-routing.state',{sessionId:'S'}])
})
it('spec Scenario "The panel shows only subtask routing, never a main-session decision"',()=>{
 // Old Host views may still carry main fields; the panel no longer renders them.
 const view={mode:'AUTO',depth:'higher',effort:'high',reason:'jev'}
 const markup=renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:view as never,initiallyOpen:true})).replace(/<[^>]+>/g,' ')
 for(const text of ['AUTO: subtask routing','the main session keeps your model and effort unchanged']) expect(markup).toContain(text)
 for(const text of ['This turn plugin output','AUTO · higher','jev']) expect(markup).not.toContain(text)
 const manual=renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:{mode:'MANUAL'},initiallyOpen:true})).replace(/<[^>]+>/g,' ')
 expect(manual).toContain('No subtask routing')
 expect(markup).not.toContain('anchor')
})
it('spec Scenario "No reply-bar rating button is registered"',()=>{
 const registrations: {name:string}[] = []
 const ctx={effect:(callback:()=>unknown)=>callback(),locale:fakeLocale('zh').service,slots:{inject:(_name:string,callback:()=>void)=>callback(),register:(options:{name:string})=>{registrations.push(options);return ()=>{}}}}
 apply(ctx as never)
 expect(registrations.map(r=>r.name).sort()).toEqual(['conversation.input.right','settings.section'])
})
it('spec Scenario "The chip and panel show the disabled state"',()=>{
 const base={mode:'MANUAL' as const}
 const render=(view:object,open:boolean)=>renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:view as never,initiallyOpen:open}))
 const chip=render({...base,disabled:{category:'insufficient-credits',at:Date.UTC(2026,9,20,7,0)}},false)
 const visible=chip.replace(/<[^>]+>/g,' ')
 expect(visible).toContain('Jev disabled')
 expect(chip).toMatch(/title="[^"]*Out of credits/)
 expect(chip).toContain('data-disabled="true"')
 const panel=render({...base,disabled:{category:'insufficient-credits',at:Date.UTC(2026,9,20,7,0)}},true).replace(/<[^>]+>/g,' ')
 for(const text of ['insufficient-credits','Out of credits','Click AUTO to retry']) expect(panel).toContain(text)
 const normal=render({mode:'MANUAL'},false)
 expect(normal.replace(/<[^>]+>/g,' ')).not.toContain('Jev disabled')
 expect(normal).not.toContain('data-disabled="true"')
})
it('locked MANUAL ignores an earlier Jev failure state',()=>{
 const view={mode:'MANUAL',disabled:{category:'timeout',at:Date.UTC(2026,10,4,2,30)},autoSupport:{supported:false,provider:'opencode-go',model:'deepseek-v4.1-flash'}}
 const chip=renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:view as never}))
 const text=chip.replace(/<[^>]+>/g,' ')
 expect(text).toContain('MANUAL')
 expect(text).not.toContain('Jev disabled')
 expect(chip).toContain('data-locked="true"')
 expect(chip).not.toContain('data-disabled="true"')
 expect(chip).toContain('amr-info')
})
it('spec Scenario "Chip styling and hover panel"',()=>{
 const render=(open:boolean)=>renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:{mode:'MANUAL'},initiallyOpen:open}))
 const closed=render(false)
 // One button: mode text first, the switch icon after it; no border.
 expect(closed.match(/<button/g)).toHaveLength(1)
 expect(closed).toMatch(/<button[^>]*>\s*<span[^>]*>MANUAL<\/span>\s*<svg/)
 expect(closed).not.toMatch(/border:1px/)
 expect(closed).toMatch(/border:(none|0)/)
 expect(closed).not.toContain('▾')
 // Panel is not rendered until hover or focus opens it.
 expect(closed).not.toContain('aria-label="Automatic routing status"')
 expect(render(true)).toContain('aria-label="Automatic routing status"')
 // Hover/focus wiring is a pure function; real pointer timing is checked in the GUI.
 expect((['enter','focus','leave','blur'] as const).map(panelOpenAfter)).toEqual([true,true,false,false])
})
it('decision_hint_shows_once',()=>{
 const d={id:7,source:'subagent' as const,depth:'higher',effort:'high',status:'applied',confidence:0.9,ms:500}
 let seen:number|undefined
 const shown=nextToast(seen,d)
 expect(shown).toMatchObject({id:7});seen=shown!.id
 expect(nextToast(seen,d)).toBeUndefined()
 expect(nextToast(seen,undefined)).toBeUndefined()
 const markup=renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:{mode:'AUTO'},initialToast:{id:7,lines:toastText(d)}}))
 expect(markup).toContain('role="status"')
 expect(markup).toContain('subtask · applied')
 expect(markup).toContain('pointer-events:none')
})
it('spec Scenario "The hover panel shows the latest decision distribution"',()=>{
 const render=(view:object)=>renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:view as never,initiallyOpen:true})).replace(/<[^>]+>/g,' ')
 const panel=render({mode:'AUTO',decision:{id:1,source:'subagent',tier:'higher',depth:'higher',status:'applied',probabilities:{baseline:0.3,higher:0.7},provider:'claude',model:'claude-opus-5-5',effort:'high',ms:780,decisionProvider:'openrouter',decisionModel:'typesafe/jev-1.13'}})
 expect(panel).toContain('Latest decision')
 expect(panel).toContain('subtask · applied')
 expect(panel).toContain('investment distribution: baseline 30% / higher 70%')
 expect(render({mode:'AUTO'})).not.toContain('Latest decision')
})
it('locked_chip_explains_the_claude_gpt_support_scope',()=>{
 const view={mode:'MANUAL',autoSupport:{supported:false,provider:'opencode-go',model:'deepseek-v4.1-flash'}}
 const markup=renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:view as never,initiallyOpen:true}))
 expect(markup).toContain('data-locked="true"')
 expect(markup).toContain('aria-disabled="true"')
 expect(markup).toContain('data-info-outline="true"')
 expect(markup).toContain('only supports the Claude / GPT')
 expect(markup).toContain('https://github.com/prgrmrwy/dsh-auto-model-routing')
 expect(markup).toContain('target="_blank"')
 expect(markup).not.toContain('amr-swap')
 expect(markup).not.toContain('Click to toggle automatic subtask routing')
 const supported=renderToStaticMarkup(createElement(RoutingChip,{sessionId:'S',rpc:{call:async()=>({ok:true})},initialView:{mode:'MANUAL',autoSupport:{supported:true}} as never,initiallyOpen:false}))
 expect(supported).toContain('amr-swap')
 expect(supported).not.toContain('data-locked="true"')
 expect(supported).toContain('Click to toggle automatic subtask routing')
})
