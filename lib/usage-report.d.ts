type Failure = 'decode-failed' | 'tail-incomplete' | 'parse-failed' | 'missing-log';
export declare function buildReport(home: string, options?: {
    since?: string;
}): {
    since: string | null;
    failures: Record<Failure, number>;
    excluded: {
        child: number;
        seeded: number;
    };
    coverage: {
        userTurns: number;
        turnsWithoutRecord: number;
        unlinkedBindings: number;
        autoSessionsWithoutRecord: number;
    };
    groups: {
        group: string;
        historical: boolean;
        subgroups: {
            model: string;
            depth: string;
            decisions: number;
            sessions: number;
            calls: number;
            callsPerDecision: {
                median: number;
                max: number;
            };
            tokens: Record<string, {
                sum: number | null;
                mean: number | null;
                present: number;
                calls: number;
            }>;
            byEffort: {
                [k: string]: {
                    decisions: number;
                    calls: number;
                };
            };
            feedback: Record<string, number>;
            implicit: {
                counts: {
                    explicit: number;
                    negative: number;
                    'implicit-ok': number;
                    inconclusive: number;
                    unobserved: number;
                };
                explicit: {
                    conflict: number;
                };
                exposedExplicit: {
                    conflict: number;
                };
                negative: {
                    'aborted-user': number;
                    'manual-switch': number;
                };
            };
            conclusion: string;
        }[];
    }[];
    referenceBeforeAuto: {
        model: string;
        calls: number;
        sessions: number;
        effort: {
            [k: string]: number;
        };
        autoEffort: {
            [k: string]: number;
        };
    }[];
    caveats: string[];
};
export {};
