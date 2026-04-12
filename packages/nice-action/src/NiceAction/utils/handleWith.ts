// import type { NiceAction } from "../NiceAction";
// import type { NiceActionDomain } from "../NiceActionDomain";
// import type { IActionCase, INiceActionDomain } from "../NiceActionDomain.types";

// // ---------------------------------------------------------------------------
// // forDomain — case matching any active id in the domain
// // ---------------------------------------------------------------------------

// /**
//  * Builds a case that fires for any action whose domain exactly matches `domain`.
//  * The handler receives the fully-hydrated action, narrowed to all schema ids.
//  *
//  * Use with `action.handleWith([...])` (sync) or `action.handleWithAsync([...])` (async).
//  *
//  * @example
//  * ```ts
//  * action.handleWith([
//  *   forDomain(err_payments, (h) => {
//  *     matchFirst(h, {
//  *       payment_failed: ({ reason }) => res.status(402).json({ reason }),
//  *       card_expired:   ()           => res.status(402).json({ expired: true }),
//  *     });
//  *   }),
//  * ]);
//  * ```
//  */
// export function forDomain<ACT_DOM extends INiceActionDomain>(
//   domain: NiceActionDomain<ACT_DOM>,
//   handler: (action: NiceAction<ACT_DOM, ACT_DOM["schema"][string]>) => void | Promise<void>,
// ): IActionCase<ACT_DOM> {
//   return { _domain: domain, _ids: undefined, _handler: handler };
// }

// // ---------------------------------------------------------------------------
// // forIds — case matching only when specific ids are active
// // ---------------------------------------------------------------------------

// /**
//  * Builds a case that fires only if the action's domain matches `domain` **and**
//  * at least one of `ids` is active on the action.
//  * The handler receives the fully-hydrated action, narrowed to `IDS[number]`.
//  *
//  * @example
//  * ```ts
//  * action.handleWith([
//  *   forIds(err_feature, ["not_found", "forbidden"], (h) => {
//  *     // h.getContext("not_found") and h.getContext("forbidden") are both available
//  *     if (h.hasId("not_found")) res.status(404).json({ missing: h.getContext("not_found").resource });
//  *     if (h.hasId("forbidden")) res.status(403).json({ denied: true });
//  *   }),
//  *
//  *   // Fallback: any other err_feature action
//  *   forDomain(err_feature, (h) => res.status(500).json({ action: h.message })),
//  * ]);
//  * ```
//  */
// export function forIds<
//   ACT_DOM extends INiceActionDomain,
//   IDS extends ReadonlyArray<keyof ACT_DOM["schema"]>,
// >(
//   domain: NiceActionDomain<ACT_DOM>,
//   ids: IDS,
//   handler: (action: NiceAction<ACT_DOM, ACT_DOM["schema"][IDS[number]]>) => void | Promise<void>,
// ): IActionCase<ACT_DOM> {
//   return { _domain: domain, _ids: ids, _handler: handler };
// }
