/**
 * A small state-graph runtime for MIMI's agents.
 *
 * The shape is borrowed from LangGraph — explicit state with reducers, nodes
 * joined by conditional edges, a step ceiling, and interrupt/resume — but
 * written here rather than taken as a dependency. Three reasons, in order of
 * weight:
 *
 *  1. The Python distribution cannot run in Supabase Edge Functions at all,
 *     and standing up a separate Python service would route customers' bank
 *     transactions through one more system. Fewer places that data exists is
 *     worth more than any framework feature.
 *  2. The heavy logic in this product is deliberately *not* the model —
 *     internal-transfer matching and the 1 tỷ threshold are deterministic code
 *     with tests, because a wrong answer there changes somebody's tax position.
 *     What is left for a graph to orchestrate is small.
 *  3. Everything here is pure, so Vitest runs it directly, the same split that
 *     makes scoring.ts and internal-transfer.ts trustworthy.
 *
 * If the day comes when real LangGraph is worth it, the concepts line up and
 * the nodes port over.
 */

export const START = '__start__' as const;
export const END = '__end__' as const;

/** A node returns a partial update, never the whole state. */
export type NodeResult<S> = Partial<S> | void;

export type NodeFn<S, C = unknown> = (
  state: Readonly<S>,
  ctx: C
) => NodeResult<S> | Promise<NodeResult<S>>;

/** Decides where to go next. Returning END finishes the run. */
export type RouterFn<S, C = unknown> = (
  state: Readonly<S>,
  ctx: C
) => string | Promise<string>;

/**
 * How a partial update merges into the running state, per key.
 *
 * Without this every node would have to read-modify-write whole arrays, and
 * two nodes appending to the same list would silently clobber each other. The
 * reducer is where "append" versus "replace" is stated once, next to the field
 * it governs.
 */
export type Reducers<S> = { [K in keyof S]?: (current: S[K], incoming: S[K]) => S[K] };

/** Append instead of replace — the common case for logs and collected rows. */
export function appendReducer<T>(current: T[], incoming: T[]): T[] {
  return [...(current ?? []), ...(incoming ?? [])];
}

export interface Interrupt {
  /** Why the run stopped, for the UI that has to ask the question. */
  reason: string;
  /** Anything the human needs in order to answer. */
  payload?: unknown;
}

/**
 * Thrown by a node that cannot proceed without a person.
 *
 * The label review queue is exactly this: a classification the model is not
 * confident about must not silently become a number on a tax form. Raising
 * rather than returning means a node cannot forget to stop.
 */
export class GraphInterrupt extends Error {
  constructor(readonly interrupt: Interrupt) {
    super(`interrupted: ${interrupt.reason}`);
    this.name = 'GraphInterrupt';
  }
}

export interface Checkpoint<S> {
  state: S;
  /** Node to run on resume. */
  next: string;
  steps: number;
  interrupt?: Interrupt;
}

export interface RunResult<S> {
  state: S;
  /** 'done' reached END, 'interrupted' needs a human, 'exhausted' hit the cap. */
  status: 'done' | 'interrupted' | 'exhausted';
  steps: number;
  /** Node names in the order they ran — the audit trail for "why this answer". */
  path: string[];
  interrupt?: Interrupt;
  /** Present unless the run finished; feed back to `resume`. */
  checkpoint?: Checkpoint<S>;
}

export interface GraphSpec<S, C = unknown> {
  nodes: Record<string, NodeFn<S, C>>;
  /** Static next-node, or a router for branching. START must have an entry. */
  edges: Record<string, string | RouterFn<S, C>>;
  reducers?: Reducers<S>;
  /**
   * Hard ceiling on node executions. A model that keeps asking for one more
   * tool will otherwise loop until the function times out and bill for every
   * turn; failing at a known number is cheaper and easier to diagnose.
   */
  maxSteps?: number;
}

function merge<S extends object>(state: S, update: Partial<S>, reducers?: Reducers<S>): S {
  const next = { ...state } as S;
  for (const key of Object.keys(update) as (keyof S)[]) {
    const incoming = update[key] as S[keyof S];
    if (incoming === undefined) continue;
    const reduce = reducers?.[key];
    next[key] = reduce ? reduce(state[key], incoming) : incoming;
  }
  return next;
}

export class StateGraph<S extends object, C = unknown> {
  private readonly maxSteps: number;

  constructor(private readonly spec: GraphSpec<S, C>) {
    this.maxSteps = spec.maxSteps ?? 25;
    if (!(START in spec.edges)) {
      // Caught at construction rather than at the first request, because a
      // graph with no entry point is a programming error, not a runtime one.
      throw new Error('graph has no edge from START');
    }
  }

  run(initial: S, ctx: C): Promise<RunResult<S>> {
    return this.execute(initial, this.spec.edges[START] as string, 0, ctx);
  }

  /** Continue a run that stopped for a human, with whatever they decided. */
  resume(checkpoint: Checkpoint<S>, update: Partial<S>, ctx: C): Promise<RunResult<S>> {
    const state = merge(checkpoint.state, update, this.spec.reducers);
    return this.execute(state, checkpoint.next, checkpoint.steps, ctx);
  }

  private async execute(initial: S, from: string, steps: number, ctx: C): Promise<RunResult<S>> {
    let state = initial;
    let current = from;
    const path: string[] = [];

    while (current !== END) {
      if (steps >= this.maxSteps) {
        return {
          state,
          status: 'exhausted',
          steps,
          path,
          checkpoint: { state, next: current, steps },
        };
      }

      const node = this.spec.nodes[current];
      if (!node) throw new Error(`unknown node "${current}"`);

      path.push(current);
      steps++;

      let update: NodeResult<S>;
      try {
        update = await node(state, ctx);
      } catch (e) {
        if (e instanceof GraphInterrupt) {
          // State is checkpointed *before* the interrupting node's effects, so
          // resuming re-runs it with the human's answer rather than skipping it.
          return {
            state,
            status: 'interrupted',
            steps,
            path,
            interrupt: e.interrupt,
            checkpoint: { state, next: current, steps, interrupt: e.interrupt },
          };
        }
        throw e;
      }

      if (update) state = merge(state, update, this.spec.reducers);

      const edge = this.spec.edges[current];
      if (edge === undefined) {
        throw new Error(`node "${current}" has no outgoing edge`);
      }
      current = typeof edge === 'function' ? await edge(state, ctx) : edge;
    }

    return { state, status: 'done', steps, path };
  }
}
