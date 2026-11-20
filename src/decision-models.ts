/**
 * Live catalog of free OpenRouter decision models.
 *
 * Only OpenRouter's public, unauthenticated model API is read; no credential
 * crosses this module. A model is listed only when it is currently callable for
 * free through the decisions endpoint the plugin uses:
 * - the catalog reports `decisions` output and `/api/alpha/decisions`,
 * - every catalog price is zero and the model has not expired,
 * - its own endpoint list has at least one available (status 0) endpoint
 *   whose prices are all zero.
 */
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models?output_modalities=decisions'
const ENDPOINTS_URL = (id: string) => `https://openrouter.ai/api/v1/models/${id.split('/').map(encodeURIComponent).join('/')}/endpoints`
const DECISIONS_PATH = '/api/alpha/decisions'
const MAX_BODY = 4 * 1024 * 1024
const MODEL_ID = /^[A-Za-z0-9._:/~-]{1,128}$/
const CACHE_MS = 30_000

export interface DecisionModelEntry { id: string; name: string }
export type DecisionModelList =
  | { status: 'ok'; models: DecisionModelEntry[]; fetchedAt: number }
  | { status: 'failed'; reason: 'unavailable' | 'timeout' | 'invalid-response'; fetchedAt: number }

type Fetch = (input: string, init: RequestInit) => Promise<Response>

const free = (pricing: unknown) => typeof pricing === 'object' && pricing !== null && !Array.isArray(pricing)
  && Object.entries(pricing).every(([key, value]) => key === 'discount' || (typeof value === 'string' || typeof value === 'number') && Number(value) === 0)

async function readJson(fetchImpl: Fetch, url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetchImpl(url, { method: 'GET', redirect: 'error', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw new Error(`HTTP ${response.status}`) }
  const text = await response.text()
  if (text.length > MAX_BODY) throw new SyntaxError('response too large')
  return JSON.parse(text)
}

/** Fetches and filters the catalog once. Never throws. */
export async function fetchFreeDecisionModels(fetchImpl: Fetch = fetch, timeoutMs = 10_000, now = () => Date.now()): Promise<DecisionModelList> {
  const deadline = AbortSignal.timeout(timeoutMs)
  try {
    const catalog = await readJson(fetchImpl, OPENROUTER_MODELS_URL, deadline) as { data?: unknown }
    if (!Array.isArray(catalog?.data)) return { status: 'failed', reason: 'invalid-response', fetchedAt: now() }
    const nowSeconds = now() / 1000
    const candidates = (catalog.data as Record<string, any>[]).filter(m => typeof m?.id === 'string' && MODEL_ID.test(m.id)
      && Array.isArray(m.architecture?.output_modalities) && m.architecture.output_modalities.includes('decisions')
      && Array.isArray(m.endpoints) && m.endpoints.includes(DECISIONS_PATH)
      && free(m.pricing)
      && !(m.expiration_date && Date.parse(String(m.expiration_date)) / 1000 <= nowSeconds))
    const checked = await Promise.all(candidates.map(async m => {
      try {
        const detail = await readJson(fetchImpl, ENDPOINTS_URL(m.id), deadline) as { data?: { endpoints?: unknown } }
        const endpoints = detail?.data?.endpoints
        const callable = Array.isArray(endpoints) && endpoints.some((e: any) => e?.status === 0 && free(e.pricing))
        return callable ? { id: m.id as string, name: typeof m.name === 'string' ? m.name : m.id } : undefined
      } catch (error) {
        if (deadline.aborted) throw error
        return undefined
      }
    }))
    const models = checked.filter((m): m is DecisionModelEntry => m !== undefined).sort((a, b) => a.id.localeCompare(b.id))
    return { status: 'ok', models, fetchedAt: now() }
  } catch (error) {
    if (deadline.aborted) return { status: 'failed', reason: 'timeout', fetchedAt: now() }
    return { status: 'failed', reason: error instanceof SyntaxError ? 'invalid-response' : 'unavailable', fetchedAt: now() }
  }
}

/** Short-lived cache with in-flight de-duplication; `refresh` bypasses the cache. */
export function decisionModelCatalog(fetchImpl: Fetch = fetch, now = () => Date.now()) {
  let last: DecisionModelList | undefined
  let pending: Promise<DecisionModelList> | undefined
  return async (refresh = false): Promise<DecisionModelList> => {
    if (pending) return pending
    if (!refresh && last?.status === 'ok' && now() - last.fetchedAt < CACHE_MS) return last
    pending = fetchFreeDecisionModels(fetchImpl, undefined, now).then(result => { last = result; return result }).finally(() => { pending = undefined })
    return pending
  }
}
