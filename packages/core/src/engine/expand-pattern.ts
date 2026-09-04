import type { ExecutionStep } from "../ast/execution.js";
import type { Payload } from "../ast/payload.js";
import type {
  CustomPatternDefinition,
  InvokeOutcome,
  PatternExpandContext,
  PatternExpr,
  PatternStmt,
} from "../ast/patterns.js";
import type { Primitive } from "../ast/primitives.js";
import type { VisualDirective } from "../ast/visuals.js";

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function resolveBinding(
  name: string,
  bindings: Record<string, string>,
): string {
  return bindings[name] ?? name;
}

function evalExpr(
  expr: PatternExpr,
  env: Record<string, unknown>,
): unknown {
  switch (expr.kind) {
    case "literal":
      return expr.value;
    case "ref": {
      let cur: unknown = env;
      for (const part of expr.path) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = (cur as Record<string, unknown>)[part];
      }
      return cur;
    }
    case "compare": {
      const left = evalExpr(expr.left, env);
      const right = evalExpr(expr.right, env);
      switch (expr.op) {
        case "<":
          return Number(left) < Number(right);
        case "<=":
          return Number(left) <= Number(right);
        case ">":
          return Number(left) > Number(right);
        case ">=":
          return Number(left) >= Number(right);
        case "==":
          return left === right;
        case "!=":
          return left !== right;
      }
    }
  }
}

interface ExpandFrame {
  steps: ExecutionStep[];
  /** When true, outer attempt loop should continue (retry). */
  retry: boolean;
  /** When true, stop further attempts (success or terminal failure). */
  done: boolean;
  /** Most recent invoke payload id (for hold visuals). */
  lastPayloadId?: string;
}

function createPayload(
  type: string,
  data: Record<string, unknown>,
): Payload {
  return { id: makeId("payload"), type, data };
}

function pushStep(
  steps: ExecutionStep[],
  name: string,
  options: {
    pattern?: string;
    primitives?: Primitive[];
    visuals?: VisualDirective[];
    description?: string;
  },
): void {
  const index = steps.length;
  steps.push({
    index,
    timestamp: index * 1000,
    name,
    pattern: options.pattern,
    interactions: [],
    primitives: options.primitives ?? [],
    visuals: options.visuals,
    description: options.description,
    traces: [],
  });
}

function channelForEmit(
  ctx: PatternExpandContext,
  targetId: string,
): string {
  if (ctx.dlqChannelId) return ctx.dlqChannelId;
  throw new Error(
    `pattern emit to "${targetId}" requires apply binding dlqChannel ` +
      `(do not reuse the request channel)`,
  );
}

function runStmts(
  stmts: PatternStmt[] | undefined,
  ctx: PatternExpandContext,
  env: Record<string, unknown>,
  steps: ExecutionStep[],
  attempt: number,
  outcome: InvokeOutcome,
  lastPayloadId?: string,
): ExpandFrame {
  const frame: ExpandFrame = {
    steps,
    retry: false,
    done: false,
    lastPayloadId,
  };
  if (!stmts) return frame;

  for (const stmt of stmts) {
    if (frame.done || frame.retry) break;

    switch (stmt.kind) {
      case "invoke": {
        const targetId = resolveBinding(stmt.target, ctx.bindings);
        const payload = createPayload(ctx.event, {
          attempt,
          method: stmt.method,
        });
        frame.lastPayloadId = payload.id;
        pushStep(steps, `Attempt ${attempt}`, {
          pattern: ctx.patternTag,
          description: `${stmt.method} → ${targetId} (${outcome})`,
          primitives: [
            {
              kind: "emit",
              nodeId: ctx.sourceNodeId,
              channelId: ctx.channelId,
              payload,
            },
            {
              kind: "mutate",
              nodeId: ctx.sourceNodeId,
              patch: { attempt, lastOutcome: outcome },
            },
          ],
          visuals: [
            {
              kind: "signal",
              targetId,
              color: outcome === "ok" ? "green" : "red",
              label: outcome === "ok" ? "ok" : "fail",
            },
          ],
        });

        const branch =
          outcome === "ok" ? stmt.onSuccess : stmt.onFailure;
        const nested = runStmts(
          branch,
          ctx,
          env,
          steps,
          attempt,
          outcome,
          frame.lastPayloadId,
        );
        frame.retry = nested.retry;
        frame.done = nested.done;
        frame.lastPayloadId = nested.lastPayloadId ?? frame.lastPayloadId;
        if (outcome === "ok" && !frame.retry) {
          frame.done = true;
        }
        break;
      }
      case "if": {
        const cond = Boolean(evalExpr(stmt.condition, env));
        const nested = runStmts(
          cond ? stmt.then : stmt.else,
          ctx,
          env,
          steps,
          attempt,
          outcome,
          frame.lastPayloadId,
        );
        frame.retry = nested.retry;
        frame.done = nested.done;
        frame.lastPayloadId = nested.lastPayloadId ?? frame.lastPayloadId;
        break;
      }
      case "retry":
        frame.retry = true;
        break;
      case "hold": {
        pushStep(steps, stmt.label ?? "Backoff", {
          pattern: ctx.patternTag,
          description: `Hold ${stmt.durationMs}ms`,
          primitives: [{ kind: "delay", durationMs: stmt.durationMs }],
          visuals: [
            {
              kind: "hold",
              targetId: resolveBinding("target", ctx.bindings),
              payloadId: frame.lastPayloadId ?? stmt.payloadBinding,
              durationMs: stmt.durationMs,
              label: stmt.label ?? "Backoff",
              color: "yellow",
            },
          ],
        });
        break;
      }
      case "emit": {
        const targetId = resolveBinding(stmt.target, ctx.bindings);
        const channelId = channelForEmit(ctx, targetId);
        pushStep(steps, `Emit ${stmt.payloadType}`, {
          pattern: ctx.patternTag,
          description: `${stmt.payloadType} → ${targetId}`,
          primitives: [
            {
              kind: "emit",
              nodeId: resolveBinding("target", ctx.bindings),
              channelId,
              payload: createPayload(stmt.payloadType, {
                attempt,
                from: stmt.payloadBinding,
              }),
            },
          ],
          visuals: [
            {
              kind: "signal",
              targetId,
              color: "red",
              label: stmt.payloadType,
            },
          ],
        });
        frame.done = true;
        break;
      }
      case "mutate": {
        pushStep(steps, `Mutate ${stmt.nodeId}`, {
          pattern: ctx.patternTag,
          primitives: [
            {
              kind: "mutate",
              nodeId: resolveBinding(stmt.nodeId, ctx.bindings),
              patch: stmt.patch,
            },
          ],
        });
        break;
      }
    }
  }

  return frame;
}

/**
 * Expand a custom pattern into linear ExecutionSteps.
 * Retries are unrolled; invoke branches follow scripted outcomes (no RNG).
 */
export function expandPattern(
  pattern: CustomPatternDefinition,
  ctx: PatternExpandContext,
): ExecutionStep[] {
  const handler = pattern.handlers.find((h) => h.event === ctx.event);
  if (!handler) {
    throw new Error(
      `Pattern ${pattern.name} has no onEvent handler for "${ctx.event}"`,
    );
  }

  if (!ctx.outcomes.length) {
    throw new Error(
      `Pattern ${pattern.name}: apply outcomes must be a non-empty list of ok|fail`,
    );
  }

  const paramEnv: Record<string, unknown> = {};
  for (const p of pattern.params) {
    paramEnv[p.name] = ctx.params?.[p.name] ?? p.defaultValue;
  }

  const steps: ExecutionStep[] = [];
  let pendingRetry = false;

  for (let i = 0; i < ctx.outcomes.length; i++) {
    const attempt = i + 1;
    const outcome = ctx.outcomes[i]!;
    const env: Record<string, unknown> = {
      ...paramEnv,
      context: { attempt },
    };

    const frame = runStmts(
      handler.body,
      { ...ctx, patternTag: ctx.patternTag ?? pattern.id },
      env,
      steps,
      attempt,
      outcome,
    );

    pendingRetry = frame.retry;
    if (frame.done && !frame.retry) {
      pendingRetry = false;
      break;
    }
    if (!frame.retry && outcome === "ok") break;
    if (!frame.retry && outcome === "fail") break;
    // retry → continue to next outcome
  }

  if (pendingRetry) {
    throw new Error(
      `Pattern ${pattern.name}: outcomes ended while retry() was pending ` +
        `(${ctx.outcomes.length} attempt(s)). Add more outcomes or ensure the ` +
        `final attempt takes the terminal branch (e.g. DeadLetter).`,
    );
  }

  return steps.map((s, index) => ({
    ...s,
    index,
    timestamp: index * 1000,
  }));
}
