import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
// Older files also carried `restore`/`anchor` (ignored, non-strict, dropped on the next write) and
// `previous` (a retired tier name: still accepted and kept as is, never written anew).
const stateSchema = z.object({
    mode: z.enum(['AUTO', 'MANUAL']),
    previous: z.enum(['simple', 'standard', 'complex', 'escalated']).optional(),
    disabled: z.object({ category: z.enum(['missing-credential', 'insufficient-credits', 'unauthorized', 'rate-limited', 'region-blocked', 'rejected', 'unavailable', 'timeout', 'invalid-response']), at: z.number() }).strict().optional(),
});
export class FileStateStore {
    directory;
    constructor(directory) {
        this.directory = directory;
    }
    path(id) {
        return resolve(this.directory, `${createHash('sha256').update(id).digest('hex')}.json`);
    }
    get(id) {
        try {
            return stateSchema.parse(JSON.parse(readFileSync(this.path(id), 'utf8')));
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return undefined;
            throw error;
        }
    }
    set(id, value) {
        const target = this.path(id);
        mkdirSync(dirname(target), { recursive: true });
        const temporary = `${target}.tmp`;
        writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
        // Both paths stay in the fixed state directory; id never supplies path components.
        renameSync(temporary, target);
    }
}
export class RoutingState {
    store;
    constructor(store) {
        this.store = store;
    }
    read(id) {
        return structuredClone(this.store.get(id) ?? { mode: 'MANUAL' });
    }
    setMode(id, mode) {
        const state = this.read(id);
        if (state.mode === mode)
            return state;
        // AUTO is the user's explicit retry: it clears the last Jev failure.
        const { disabled: _, ...kept } = state;
        return this.save(id, mode === 'AUTO' ? { ...kept, mode } : { ...state, mode });
    }
    /** Jev failed: switch to MANUAL (no restore) and keep the visible reason. */
    disable(id, category, at = Date.now()) {
        const state = this.read(id);
        return this.save(id, { mode: 'MANUAL', ...(state.previous ? { previous: state.previous } : {}), disabled: { category, at } });
    }
    save(id, state) {
        this.store.set(id, structuredClone(state));
        return structuredClone(state);
    }
}
