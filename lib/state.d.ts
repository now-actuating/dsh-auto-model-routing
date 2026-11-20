import type { Effort } from './effort.js';
import type { JevCategory } from './jev.js';
export type Mode = 'AUTO' | 'MANUAL';
export interface Selection {
    provider: string;
    model: string;
    reasoningEffort?: Effort;
}
export interface Disabled {
    category: JevCategory;
    at: number;
}
export interface SessionState {
    mode: Mode;
    previous?: 'simple' | 'standard' | 'complex' | 'escalated';
    disabled?: Disabled;
}
export interface StateStore {
    get(id: string): SessionState | undefined;
    set(id: string, value: SessionState): void;
}
export declare class FileStateStore implements StateStore {
    private readonly directory;
    constructor(directory: string);
    private path;
    get(id: string): SessionState | undefined;
    set(id: string, value: SessionState): void;
}
export declare class RoutingState {
    private readonly store;
    constructor(store: StateStore);
    read(id: string): SessionState;
    setMode(id: string, mode: Mode): SessionState;
    /** Jev failed: switch to MANUAL (no restore) and keep the visible reason. */
    disable(id: string, category: JevCategory, at?: number): SessionState;
    private save;
}
