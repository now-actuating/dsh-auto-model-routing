import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { registry as builtin } from './strategies/index.js';
const enumOf = (values) => z.enum(values);
export const FALLBACK_REASONS = ['jev-cancelled', 'needs-context', 'mode-changed', 'interrupted', 'no-usable-route', 'explicit-unavailable'];
/** New `unsupported` writes use a closed reason set; `jev-<category>` carries the failure category. */
export const closedReason = (reason) => !!reason && (FALLBACK_REASONS.includes(reason) || /^jev-[a-z-]+$/.test(reason));
function schemaFor(registry) {
    const provider = z.string().min(1).max(128);
    const route = z.object({ provider, model: z.string().min(1).max(128), reasoningEffort: z.enum(['low', 'medium', 'high', 'xhigh']) }).strict();
    return z.object({
        childId: z.string(), parentId: z.string(), rootId: z.string(),
        status: z.enum(['recommended', 'applied', 'unsupported', 'needs-context', 'failed']),
        path: z.enum(['ordinary', 'teammate', 'fork']),
        family: enumOf(registry.ids()).optional(),
        explicit: z.object({ provider, model: z.string().optional(), reasoningEffort: z.string().optional() }).strict(),
        parentSelection: z.object({ provider, model: z.string().max(128).optional(), reasoningEffort: z.string().max(32).optional() }).strict().optional(),
        decision: z.object({ id: z.number(), source: z.enum(['main', 'subagent']), tier: z.string(), depth: z.string(), capability: z.string().optional(), effort: z.string(), model: z.string().optional(), provider: z.string().optional(), status: z.string(), ms: z.number(), decisionProvider: z.string(), decisionModel: z.string(), confidence: z.number().min(0).max(1).optional(), capabilityConfidence: z.number().min(0).max(1).optional(), probabilities: z.record(z.string(), z.number().min(0).max(1)).optional(), capabilityProbabilities: z.record(z.string(), z.number().min(0).max(1)).optional() }).strict().optional(),
        route: route.optional(), actual: route.optional(), reason: z.string().max(240).optional(),
    }).strict().superRefine((r, ctx) => {
        const bad = (message) => ctx.addIssue({ code: 'custom', message });
        if (r.status === 'recommended' && r.actual)
            bad('recommended 不能含 actual');
        if (r.status === 'applied' && (!r.route || !r.actual))
            bad('applied 需要 route 与 actual');
        if (r.status === 'unsupported' && (r.route || r.actual))
            bad('unsupported 不能含 route');
        if (r.status === 'needs-context' && r.route)
            bad('needs-context 不能含 route');
    });
}
/** Records written before 0.5.0 carried these keys; reads accept exactly these values, then drop them. */
const historical = z.object({ version: z.literal(1).optional(), policyVersion: z.string().optional(), mappingVersion: z.string().optional() });
/** Strict per-child files: corrupt or mismatched records fail closed; no raw task or credentials. */
export class PolicyStore {
    directory;
    schema;
    constructor(directory, registry = builtin) {
        this.directory = directory;
        this.schema = schemaFor(registry);
    }
    path(id) { return join(this.directory, `${createHash('sha256').update(id).digest('hex')}.json`); }
    bind(id) {
        mkdirSync(this.directory, { recursive: true, mode: 0o700 });
        writeFileSync(`${this.path(id)}.bound`, id, { flag: 'wx', mode: 0o600 });
    }
    wasBound(id) {
        try {
            if (readFileSync(`${this.path(id)}.bound`, 'utf8') !== id)
                throw new Error('绑定标记损坏');
            return true;
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return false;
            throw error;
        }
    }
    get(id) {
        try {
            const raw = JSON.parse(readFileSync(this.path(id), 'utf8'));
            if (!raw || typeof raw !== 'object' || Array.isArray(raw))
                throw new Error('not an object');
            const { version, policyVersion, mappingVersion, ...rest } = raw;
            historical.parse({ version, policyVersion, mappingVersion });
            const record = this.schema.parse(rest);
            if (record.childId !== id)
                throw new Error('child identity mismatch');
            return record;
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return undefined;
            throw new Error('子任务决策无法恢复；暂停该子会话');
        }
    }
    /** Initial binding of a new managed child: the parent snapshot is mandatory, then the marker. */
    create(value) {
        if (!value.parentSelection)
            throw new Error('新建初始记录缺少 parentSelection');
        this.set(value);
        this.bind(value.childId);
    }
    set(value) {
        const checked = this.schema.parse(value);
        if (checked.status === 'unsupported' && !closedReason(checked.reason))
            throw new Error(`未知的未路由原因：${checked.reason ?? ''}`);
        mkdirSync(this.directory, { recursive: true, mode: 0o700 });
        chmodSync(this.directory, 0o700);
        const target = this.path(value.childId), temp = `${target}.${randomUUID()}.tmp`;
        writeFileSync(temp, JSON.stringify(checked), { flag: 'wx', mode: 0o600 });
        renameSync(temp, target);
    }
}
