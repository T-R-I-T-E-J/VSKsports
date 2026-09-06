/**
 * Operational alerts for conditions where money or a customer relationship is
 * already at stake.
 *
 * The audit found five such conditions — oversold order, captured payment with
 * an amount mismatch, unresolvable gateway order, suspected double charge, and
 * failed password-reset mail — each terminating in a bare `console.error` with
 * no aggregation. Nobody would learn any of them had happened.
 *
 * Deliberately dependency-free. Wiring Sentry needs a DSN and a deployment
 * decision, so instead this emits ONE machine-parseable line with a stable
 * prefix that log-based alerting (Vercel log drains, CloudWatch filters,
 * Datadog) can match today, and gives a single call site to swap for a real
 * SDK later without touching the five callers.
 */

/** Conditions worth waking someone for. Extend deliberately, not casually. */
export type AlertEvent =
  | "order.oversold"
  | "payment.amount_mismatch"
  | "payment.unresolvable_order"
  | "payment.possible_double_charge"
  | "payment.settlement_failed"
  | "email.delivery_failed"
  | "order.reconciled"
  | "order.reconcile_failed";

/** Stable, greppable prefix — alerting rules match on this. */
const PREFIX = "[ALERT]";

/**
 * Record an operational alert.
 *
 * Never throws: an alerting failure must not take down the flow that was
 * trying to report a problem. Context is serialized defensively for the same
 * reason.
 */
export function alertOps(event: AlertEvent, context: Record<string, unknown> = {}): void {
  try {
    const payload = JSON.stringify({
      event,
      at: new Date().toISOString(),
      ...context,
    });
    // console.error so it lands on the error stream that log drains watch.
    console.error(`${PREFIX} ${payload}`);
  } catch {
    // Context was not serializable (a cycle, a BigInt). Still report the event.
    console.error(`${PREFIX} {"event":"${event}","at":"${new Date().toISOString()}"}`);
  }
}
