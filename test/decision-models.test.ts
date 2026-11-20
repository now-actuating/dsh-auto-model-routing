import { expect, it } from 'vitest'
import { decisionModelCatalog, fetchFreeDecisionModels, OPENROUTER_MODELS_URL } from '../src/decision-models.js'

const catalog = { data: [
  { id: 'free/ok:free', name: 'Free OK', pricing: { prompt: '0', completion: '0' }, architecture: { output_modalities: ['decisions'] }, endpoints: ['/api/alpha/decisions'] },
  { id: 'free/down', name: 'Free down', pricing: { prompt: '0', completion: '0' }, architecture: { output_modalities: ['decisions'] }, endpoints: ['/api/alpha/decisions'] },
  { id: 'paid/jev', name: 'Paid', pricing: { prompt: '0.000000042', completion: '0' }, architecture: { output_modalities: ['decisions'] }, endpoints: ['/api/alpha/decisions'] },
  { id: 'free/request-fee', name: 'Fee', pricing: { prompt: '0', completion: '0', request: '0.001' }, architecture: { output_modalities: ['decisions'] }, endpoints: ['/api/alpha/decisions'] },
  { id: 'free/extract', name: 'Extract', pricing: { prompt: '0', completion: '0' }, architecture: { output_modalities: ['decisions'] }, endpoints: ['/api/alpha/extractions'] },
  { id: 'free/expired', name: 'Expired', pricing: { prompt: '0', completion: '0' }, architecture: { output_modalities: ['decisions'] }, endpoints: ['/api/alpha/decisions'], expiration_date: '2000-01-01' },
  { id: 'free/text', name: 'Text', pricing: { prompt: '0', completion: '0' }, architecture: { output_modalities: ['text'] }, endpoints: ['/api/alpha/decisions'] },
] }
const endpoints: Record<string, unknown> = {
  'free/ok:free': { data: { endpoints: [{ status: 0, pricing: { prompt: '0', completion: '0', discount: 0 } }] } },
  'free/down': { data: { endpoints: [{ status: -5, pricing: { prompt: '0', completion: '0' } }] } },
}
function fake() {
  const urls: string[] = []
  const fetchImpl = async (url: string, init: RequestInit) => {
    urls.push(url); expect(init.redirect).toBe('error'); expect(JSON.stringify(init.headers)).not.toMatch(/authorization/i)
    if (url === OPENROUTER_MODELS_URL) return Response.json(catalog)
    const id = decodeURIComponent(url.replace('https://openrouter.ai/api/v1/models/', '').replace(/\/endpoints$/, ''))
    return endpoints[id] ? Response.json(endpoints[id]) : new Response('{}', { status: 404 })
  }
  return { urls, fetchImpl }
}
it('lists only free, unexpired decision models with an available free endpoint', async () => {
  const { urls, fetchImpl } = fake()
  const result = await fetchFreeDecisionModels(fetchImpl)
  expect(result).toMatchObject({ status: 'ok', models: [{ id: 'free/ok:free', name: 'Free OK' }] })
  // Paid, fee-bearing, extraction-only, expired and text models are never probed.
  expect(urls.filter(u => u !== OPENROUTER_MODELS_URL).sort()).toEqual(['https://openrouter.ai/api/v1/models/free/down/endpoints', 'https://openrouter.ai/api/v1/models/free/ok%3Afree/endpoints'])
})
it('reports failures without throwing', async () => {
  expect(await fetchFreeDecisionModels(async () => new Response('x', { status: 503 }))).toMatchObject({ status: 'failed', reason: 'unavailable' })
  expect(await fetchFreeDecisionModels(async () => new Response('not json'))).toMatchObject({ status: 'failed', reason: 'invalid-response' })
  expect(await fetchFreeDecisionModels(async () => Response.json({ nope: 1 }))).toMatchObject({ status: 'failed', reason: 'invalid-response' })
  expect(await fetchFreeDecisionModels((_, init) => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted')))), 20)).toMatchObject({ status: 'failed', reason: 'timeout' })
})
it('caches briefly and bypasses the cache on refresh', async () => {
  const { urls, fetchImpl } = fake()
  let now = 1_000_000
  const read = decisionModelCatalog(fetchImpl, () => now)
  await read(); const first = urls.length
  await read(); expect(urls.length).toBe(first)
  await read(true); expect(urls.length).toBe(first * 2)
  now += 60_000; await read(); expect(urls.length).toBe(first * 3)
})
