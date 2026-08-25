/**
 * THE PUBLIC SURFACE of ReTreever_who_what.
 *
 * Everything a host may import lives here and nothing else does. The five
 * entry points below are exactly what ReTreever reaches for today — measured,
 * not guessed — so this file is the contract, and anything not re-exported
 * here is this child's private business.
 *
 * The host surface itself is PROPS, not modules: `routes` (WhoWhatRoutes) is
 * the host's URL map and every field is optional, so ReTreever passes its
 * AppRoutes and rapper passes nothing. See deps.json `_channel_why`.
 */

export { default as SearchRoute } from "./lib/SearchRoute.svelte";
export { default as ResultCard } from "./lib/ResultCard.svelte";

export { loadOrganization, loadProject } from "./lib/resultLoad";
export type { SearchResult } from "./lib/resultLoad";

export { SHARDS, shard, shardId, shardsFor, byArt } from "./lib/shared/shardIndex";
export type { ShardEntry, ShardPage } from "./lib/shared/shardIndex";

export { toTransparencyScore, formatTransparencyScore } from "./lib/whoWhatTypes";
export type { WhoWhatEndpoints, WhoWhatRoutes } from "./lib/whoWhatTypes";
