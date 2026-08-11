import { describe, it, expect } from 'vitest';
import {
  StateGraph,
  GraphInterrupt,
  appendReducer,
  START,
  END,
  type Checkpoint,
} from './graph';

interface S {
  n: number;
  log: string[];
}

const base = { reducers: { log: appendReducer<string> } };

describe('StateGraph — basic flow', () => {
  it('runs a node and reaches END', async () => {
    const g = new StateGraph<S>({
      ...base,
      nodes: { inc: (s) => ({ n: s.n + 1, log: ['inc'] }) },
      edges: { [START]: 'inc', inc: END },
    });
    const r = await g.run({ n: 41, log: [] }, {});
    expect(r.status).toBe('done');
    expect(r.state.n).toBe(42);
    expect(r.path).toEqual(['inc']);
  });

  it('merges partial updates and leaves untouched keys alone', async () => {
    const g = new StateGraph<S>({
      ...base,
      nodes: { touch: () => ({ log: ['only log'] }) },
      edges: { [START]: 'touch', touch: END },
    });
    const r = await g.run({ n: 7, log: ['before'] }, {});
    expect(r.state.n).toBe(7);
    expect(r.state.log).toEqual(['before', 'only log']);
  });

  it('applies the reducer instead of overwriting', async () => {
    // Without a reducer the second node would erase the first node's entry,
    // and the audit trail of how an answer was reached would be a single line.
    const g = new StateGraph<S>({
      ...base,
      nodes: { a: () => ({ log: ['a'] }), b: () => ({ log: ['b'] }) },
      edges: { [START]: 'a', a: 'b', b: END },
    });
    const r = await g.run({ n: 0, log: [] }, {});
    expect(r.state.log).toEqual(['a', 'b']);
  });

  it('replaces when no reducer is declared for that key', async () => {
    const g = new StateGraph<S>({
      ...base,
      nodes: { set: () => ({ n: 99 }) },
      edges: { [START]: 'set', set: END },
    });
    expect((await g.run({ n: 1, log: [] }, {})).state.n).toBe(99);
  });

  it('passes context to nodes without putting it in state', async () => {
    // companyId travels here, never through state a model can influence.
    const g = new StateGraph<S, { companyId: string }>({
      ...base,
      nodes: { read: (_s, ctx) => ({ log: [ctx.companyId] }) },
      edges: { [START]: 'read', read: END },
    });
    const r = await g.run({ n: 0, log: [] }, { companyId: 'co_1' });
    expect(r.state.log).toEqual(['co_1']);
  });
});

describe('StateGraph — branching', () => {
  it('follows a conditional edge', async () => {
    const g = new StateGraph<S>({
      ...base,
      nodes: {
        check: (s) => ({ log: [`n=${s.n}`] }),
        big: () => ({ log: ['big'] }),
        small: () => ({ log: ['small'] }),
      },
      edges: {
        [START]: 'check',
        check: (s) => (s.n > 10 ? 'big' : 'small'),
        big: END,
        small: END,
      },
    });
    expect((await g.run({ n: 50, log: [] }, {})).state.log).toContain('big');
    expect((await g.run({ n: 2, log: [] }, {})).state.log).toContain('small');
  });

  it('loops until the router says stop', async () => {
    const g = new StateGraph<S>({
      ...base,
      nodes: { step: (s) => ({ n: s.n + 1 }) },
      edges: { [START]: 'step', step: (s) => (s.n < 5 ? 'step' : END) },
    });
    const r = await g.run({ n: 0, log: [] }, {});
    expect(r.state.n).toBe(5);
    expect(r.steps).toBe(5);
  });
});

describe('StateGraph — the step ceiling', () => {
  it('stops a runaway loop instead of running until the function times out', async () => {
    // A model that keeps asking for one more tool would otherwise bill for
    // every turn and fail as an opaque timeout.
    const g = new StateGraph<S>({
      ...base,
      nodes: { spin: (s) => ({ n: s.n + 1 }) },
      edges: { [START]: 'spin', spin: 'spin' },
      maxSteps: 6,
    });
    const r = await g.run({ n: 0, log: [] }, {});
    expect(r.status).toBe('exhausted');
    expect(r.steps).toBe(6);
    // Exhaustion is resumable, so a long legitimate run can be continued
    // rather than restarted from nothing.
    expect(r.checkpoint?.next).toBe('spin');
  });
});

describe('StateGraph — interrupt and resume', () => {
  const graph = new StateGraph<S & { approved?: boolean }>({
    reducers: { log: appendReducer<string> },
    nodes: {
      classify: () => ({ log: ['classified'] }),
      confirm: (s) => {
        if (s.approved === undefined) {
          throw new GraphInterrupt({ reason: 'needs_review', payload: { count: 3 } });
        }
        return { log: [`human said ${s.approved}`] };
      },
      finish: () => ({ log: ['finished'] }),
    },
    edges: { [START]: 'classify', classify: 'confirm', confirm: 'finish', finish: END },
  });

  it('stops at the node that needs a person, and says why', async () => {
    const r = await graph.run({ n: 0, log: [] }, {});
    expect(r.status).toBe('interrupted');
    expect(r.interrupt?.reason).toBe('needs_review');
    expect(r.interrupt?.payload).toEqual({ count: 3 });
    // The earlier node's work is kept; only the undecided part waits.
    expect(r.state.log).toEqual(['classified']);
  });

  it('re-runs the interrupting node on resume rather than skipping it', async () => {
    const first = await graph.run({ n: 0, log: [] }, {});
    const r = await graph.resume(first.checkpoint as Checkpoint<S & { approved?: boolean }>, { approved: true }, {});
    expect(r.status).toBe('done');
    expect(r.state.log).toEqual(['classified', 'human said true', 'finished']);
  });

  it('carries the step count across the pause, so the ceiling still holds', async () => {
    const first = await graph.run({ n: 0, log: [] }, {});
    const r = await graph.resume(first.checkpoint as Checkpoint<S & { approved?: boolean }>, { approved: false }, {});
    expect(r.steps).toBeGreaterThan(first.steps);
  });

  it('can be interrupted again after resuming', async () => {
    const first = await graph.run({ n: 0, log: [] }, {});
    // Resuming without an answer must not slip past the gate.
    const again = await graph.resume(first.checkpoint as Checkpoint<S & { approved?: boolean }>, {}, {});
    expect(again.status).toBe('interrupted');
  });
});

describe('StateGraph — construction and wiring errors', () => {
  it('refuses a graph with no entry point', () => {
    expect(
      () => new StateGraph<S>({ nodes: { a: () => ({}) }, edges: { a: END } })
    ).toThrow(/no edge from START/);
  });

  it('reports an edge pointing at a node that does not exist', async () => {
    const g = new StateGraph<S>({ nodes: { a: () => ({}) }, edges: { [START]: 'nope', a: END } });
    await expect(g.run({ n: 0, log: [] }, {})).rejects.toThrow(/unknown node "nope"/);
  });

  it('reports a node with no way out', async () => {
    const g = new StateGraph<S>({ nodes: { a: () => ({}) }, edges: { [START]: 'a' } });
    await expect(g.run({ n: 0, log: [] }, {})).rejects.toThrow(/no outgoing edge/);
  });

  it('lets a real error escape instead of swallowing it as an interrupt', async () => {
    const g = new StateGraph<S>({
      nodes: { boom: () => { throw new Error('db down'); } },
      edges: { [START]: 'boom', boom: END },
    });
    await expect(g.run({ n: 0, log: [] }, {})).rejects.toThrow('db down');
  });
});
