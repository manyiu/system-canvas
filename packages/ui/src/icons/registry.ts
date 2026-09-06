import type { NodeKind } from "@system-canvas/core";

/**
 * Icon slug → display glyph (emoji). Used in examples via `icon: "redis"` etc.
 * Keep slugs stable — they are part of the DSL / example definitions.
 */
export const NODE_ICON_SLUGS = {
  // Services & compute
  microservice: "⚙️",
  service: "⚙️",
  worker: "👷",
  "worker-pool": "👷",
  scheduler: "⏱️",
  processor: "⚡",
  aggregator: "📊",
  router: "🔀",
  orchestrator: "🎯",
  inference: "🧠",
  gpu: "🖥️",
  transcoder: "🎞️",

  // Gateways & edge
  cdn: "🌐",
  "load-balancer": "⚖️",
  "api-gateway": "🚪",
  gateway: "🚪",
  websocket: "🔌",

  // Databases & stores
  postgres: "🐘",
  mysql: "🐬",
  mongodb: "🍃",
  redis: "🔴",
  cassandra: "💿",
  elasticsearch: "🔍",
  dynamodb: "⚡",
  timeseries: "📈",
  s3: "🪣",
  blob: "🪣",
  cache: "💾",
  database: "🗄️",

  // Queues & messaging
  kafka: "📨",
  rabbitmq: "🐰",
  queue: "📨",
  stream: "〰️",
  pubsub: "📢",
  notification: "🔔",

  // Clients & external systems
  client: "👤",
  mobile: "📱",
  browser: "🖥️",
  external: "🌐",
  payment: "💳",
  bank: "🏦",
  email: "✉️",
  push: "📲",
  sms: "💬",
  stripe: "💳",

  // Domain patterns
  geo: "📍",
  lock: "🔒",
  search: "🔍",
  video: "🎬",
  chat: "💬",
  analytics: "📊",
  crawler: "🕷️",
  ad: "📣",
  game: "🎮",
  ai: "🤖",
  leaderboard: "🏆",
  feed: "📰",
  match: "🤝",
  auction: "🔨",
  ticket: "🎫",
  delivery: "🚚",
  ride: "🚗",
  document: "📄",
  chess: "♟️",
  metrics: "📉",
  workflow: "🔁",
  artifact: "📦",
  seed: "🌱",
} as const;

export type NodeIconSlug = keyof typeof NODE_ICON_SLUGS;

const KIND_FALLBACK: Record<NodeKind, string> = {
  service: "⚙️",
  database: "🗄️",
  queue: "📨",
  gateway: "🚪",
  external: "🌐",
  custom: "📦",
};

/** Infer icon slug from node label + kind when no explicit icon is set. */
const LABEL_RULES: ReadonlyArray<[RegExp, NodeIconSlug]> = [
  [/cdn/i, "cdn"],
  [/load.?balanc/i, "load-balancer"],
  [/payment|stripe|bank|checkout/i, "payment"],
  [/api.?gateway|gateway|receiver/i, "api-gateway"],
  [/redis|cache|bloom|sketch|trie|presence|counter|heap|sorted|shard/i, "redis"],
  [/postgres|sql|rdbms|ledger|inventory|workflow.?db/i, "postgres"],
  [/mongo|timeseries|op.?log|inverted/i, "mongodb"],
  [/kafka|queue|stream|frontier|bus|ingest/i, "kafka"],
  [/s3|blob|object.?store|artifact|content.?store/i, "s3"],
  [/elastic|search.?index|typeahead/i, "elasticsearch"],
  [/rider|driver|donor|git.?push|seed/i, "client"],
  [/mobile|phone|app$/i, "mobile"],
  [/notification|push|receipt/i, "notification"],
  [/geo|location|surge/i, "geo"],
  [/worker|runner|judge|crawler|transcode|downsample/i, "worker"],
  [/scheduler|cron/i, "scheduler"],
  [/video|thumbnail|transcode/i, "video"],
  [/chat|message|comment|whatsapp/i, "chat"],
  [/crawler|spider|scraper|robots/i, "crawler"],
  [/gpu|inference|model|orchestrator|chatgpt/i, "inference"],
  [/leaderboard|chess|game/i, "game"],
  [/metric|monitor|dashboard|aggregat|analytics|view.?agg/i, "analytics"],
  [/feed|news|post|ranking|timeline/i, "feed"],
  [/match|swipe|tinder|trip|dispatch/i, "match"],
  [/auction|bid/i, "auction"],
  [/ticket|booking|seat/i, "ticket"],
  [/deliver|order|restaurant/i, "delivery"],
  [/uber|trip|ride/i, "ride"],
  [/doc|collab|google.?docs/i, "document"],
  [/ad.?server|click|billing/i, "ad"],
  [/workflow|github.?actions/i, "workflow"],
  [/email|smtp/i, "email"],
  [/lock|idempot/i, "lock"],
  [/websocket|ws/i, "websocket"],
  [/client|browser|user|customer/i, "client"],
  [/service|api/i, "microservice"],
];

export function inferIconSlug(label: string, kind: NodeKind): NodeIconSlug | undefined {
  for (const [pattern, slug] of LABEL_RULES) {
    if (pattern.test(label)) return slug;
  }
  if (kind === "queue") return "kafka";
  if (kind === "database") return "database";
  if (kind === "gateway") return "api-gateway";
  if (kind === "external") return "client";
  if (kind === "service") return "microservice";
  return undefined;
}

export function resolveNodeIcon(icon: string | undefined, kind: NodeKind, label?: string): string {
  if (icon) {
    const mapped = NODE_ICON_SLUGS[icon as NodeIconSlug];
    if (mapped) return mapped;
    // Allow passing a literal emoji through DSL
    if (!/^[a-z][a-z0-9-]*$/i.test(icon)) return icon;
  }

  const inferred = label ? inferIconSlug(label, kind) : undefined;
  if (inferred) return NODE_ICON_SLUGS[inferred];

  return KIND_FALLBACK[kind] ?? "📦";
}
