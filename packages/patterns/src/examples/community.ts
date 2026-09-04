import { defineExample } from "./define-example.js";
import {
  exponentialBackoffDlqExample,
  exponentialBackoffExample,
} from "../custom/exponential-backoff.js";

export const foodReviewAppExample = defineExample({
  id: "food-review-app",
  name: "Food Review App",
  difficulty: "community",
  description: "Restaurant reviews with photo uploads, ratings aggregation, and geo search.",
  tags: ["reviews", "geo", "aggregation"],
  patternsUsed: ["rating-aggregation", "photo-storage", "geo-search"],
  layoutHint: "pipeline",
  defaultScenarioId: "fra-review",
  columns: [
    ["Client"],
    ["APIGateway"],
    ["ReviewService", "SearchService"],
    ["ReviewDB", "RatingCache", "ObjectStore", "GeoIndex"],
  ],
  nodes: [
    { id: "Client", kind: "external", label: "Client" },
    { id: "APIGateway", kind: "gateway", label: "API Gateway" },
    { id: "ReviewService", kind: "service", label: "Review Service", icon: "microservice" },
    { id: "SearchService", kind: "service", label: "Search Service", icon: "microservice" },
    { id: "ReviewDB", kind: "database", label: "Review DB", icon: "postgres" },
    { id: "RatingCache", kind: "database", label: "Rating Cache", icon: "redis" },
    { id: "ObjectStore", kind: "database", label: "Photo Store", icon: "s3" },
    { id: "GeoIndex", kind: "database", label: "Geo Index", icon: "mongodb" },
  ],
  channels: [
    { id: "ch-review", source: "Client", target: "APIGateway", label: "submit review", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-persist", source: "APIGateway", target: "ReviewService", label: "create review", delivery: "sync", relationship: "command", payloadKind: "command" },
    { source: "ReviewService", target: "ReviewDB", label: "persist", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-rating", source: "ReviewService", target: "RatingCache", label: "update avg", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-photo", source: "Client", target: "ObjectStore", label: "upload photo", delivery: "sync", relationship: "command", payloadKind: "command" },
    { source: "ReviewService", target: "ObjectStore", label: "attach photo key", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-search", source: "Client", target: "APIGateway", label: "nearby", delivery: "sync", relationship: "query", payloadKind: "query" },
    { source: "APIGateway", target: "SearchService", label: "geo search", delivery: "sync", relationship: "query", payloadKind: "query" },
    { source: "SearchService", target: "GeoIndex", label: "geo filter", delivery: "sync", relationship: "query", payloadKind: "query" },
  ],
  scenarios: [
    { id: "fra-review", name: "Submit Review", steps: [
      { name: "Submit", channelId: "ch-review", fromNode: "Client", payloadType: "SubmitReview", payloadData: { rating: 4, text: "great tacos" } },
      { name: "Persist", channelId: "ch-persist", fromNode: "APIGateway", payloadType: "CreateReview", payloadData: { restaurantId: "r1" } },
      { name: "Update Rating", channelId: "ch-rating", fromNode: "ReviewService", payloadType: "UpdateAvg", payloadData: { restaurantId: "r1", avg: 4.2 } },
    ]},
    { id: "fra-photo", name: "Upload Photo", steps: [
        { name: "Attach Photo", channelId: "ch-photo", fromNode: "Client", payloadType: "UploadPhoto", payloadData: { reviewId: "rev1" } },
    ]},
    { id: "fra-search", name: "Nearby Restaurants", steps: [
      { name: "Geo Search", channelId: "ch-search", fromNode: "Client", payloadType: "NearbySearch", payloadData: { lat: 37.7, lng: -122.4 } },
      { name: "Return Results", visuals: [{ kind: "signal", targetId: "GeoIndex", color: "green" }] },
    ]},
  ],
});

export const gameLeaderboardExample = defineExample({
  id: "game-leaderboard",
  name: "Game Leaderboard",
  difficulty: "community",
  description: "Real-time game leaderboard with sorted sets, sharding, and periodic snapshots.",
  tags: ["gaming", "leaderboard", "sorted-set"],
  patternsUsed: ["sorted-set", "leaderboard-sharding", "periodic-snapshot"],
  layoutHint: "hub",
  defaultScenarioId: "glb-score",
  columns: [
    ["GameClient"],
    ["ScoreGateway"],
    ["LeaderboardService", "SnapshotService"],
    ["LeaderboardShardA", "LeaderboardShardB", "ScoreQueue"],
    ["SnapshotDB"],
  ],
  nodes: [
    { id: "GameClient", kind: "external", label: "Game Client" },
    { id: "ScoreGateway", kind: "gateway", label: "Score Gateway" },
    { id: "LeaderboardService", kind: "service", label: "Leaderboard Service", icon: "microservice" },
    { id: "SnapshotService", kind: "service", label: "Snapshot Service", icon: "microservice" },
    { id: "LeaderboardShardA", kind: "database", label: "Shard A", icon: "redis" },
    { id: "LeaderboardShardB", kind: "database", label: "Shard B", icon: "redis" },
    { id: "SnapshotDB", kind: "database", label: "Snapshot DB", icon: "postgres" },
    { id: "ScoreQueue", kind: "queue", label: "Score Queue", icon: "kafka" },
  ],
  channels: [
    { id: "ch-score", source: "GameClient", target: "ScoreGateway", label: "submit score", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-update", source: "ScoreGateway", target: "LeaderboardService", label: "update rank", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-shard", source: "LeaderboardService", target: "LeaderboardShardA", label: "zadd A", delivery: "sync", relationship: "command", payloadKind: "command" },
    { source: "LeaderboardService", target: "LeaderboardShardB", label: "zadd B", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-queue", source: "LeaderboardService", target: "ScoreQueue", label: "score event", delivery: "async", relationship: "event", payloadKind: "event" },
    { id: "ch-top", source: "GameClient", target: "ScoreGateway", label: "get top k", delivery: "sync", relationship: "query", payloadKind: "query" },
    { id: "ch-snapshot", source: "SnapshotService", target: "SnapshotDB", label: "persist snapshot", delivery: "sync", relationship: "command", payloadKind: "command" },
    { source: "ScoreQueue", target: "SnapshotService", label: "trigger snapshot", delivery: "async", relationship: "event", payloadKind: "event" },
  ],
  scenarios: [
    { id: "glb-score", name: "Submit Score", steps: [
      { name: "Game Over", channelId: "ch-score", fromNode: "GameClient", payloadType: "SubmitScore", payloadData: { score: 12500 } },
      { name: "Update Rank", channelId: "ch-update", fromNode: "ScoreGateway", payloadType: "UpdateScore", payloadData: { playerId: "p1" } },
      { name: "ZADD Shard", channelId: "ch-shard", fromNode: "LeaderboardService", payloadType: "ZAdd", payloadData: { score: 12500 } },
    ]},
    { id: "glb-topk", name: "Get Top 10", steps: [
      { name: "Query Top K", channelId: "ch-top", fromNode: "GameClient", payloadType: "GetTopK", payloadData: { k: 10 } },
      { name: "Return Leaders", visuals: [{ kind: "signal", targetId: "LeaderboardShardA", color: "green" }] },
    ]},
    { id: "glb-snapshot", name: "Periodic Snapshot", steps: [
      { name: "Snapshot Trigger", channelId: "ch-queue", fromNode: "LeaderboardService", payloadType: "SnapshotEvent", payloadData: {} },
      { name: "Persist", channelId: "ch-snapshot", fromNode: "SnapshotService", payloadType: "SaveSnapshot", payloadData: { board: "global" } },
    ]},
  ],
});

export const donationsWebsiteExample = defineExample({
  id: "donations-website",
  name: "Donations Website",
  difficulty: "community",
  description: "Charity donation platform with payment processing, campaign tracking, and receipts.",
  tags: ["payments", "campaigns", "receipts"],
  patternsUsed: ["payment-processing", "campaign-aggregation", "idempotent-donation"],
  layoutHint: "tiered",
  defaultScenarioId: "don-donate",
  columns: [
    ["DonorApp"],
    ["APIGateway"],
    ["DonationService", "CampaignService"],
    ["DonationDB", "CampaignDB", "PaymentQueue"],
    ["PaymentService"],
    ["StripeConnector", "ReceiptService"],
  ],
  nodes: [
    { id: "DonorApp", kind: "external", label: "Donor App" },
    { id: "APIGateway", kind: "gateway", label: "API Gateway" },
    { id: "DonationService", kind: "service", label: "Donation Service", icon: "microservice" },
    { id: "CampaignService", kind: "service", label: "Campaign Service", icon: "microservice" },
    { id: "PaymentService", kind: "service", label: "Payment Service", icon: "microservice" },
    { id: "DonationDB", kind: "database", label: "Donation DB", icon: "postgres" },
    { id: "CampaignDB", kind: "database", label: "Campaign DB", icon: "postgres" },
    { id: "PaymentQueue", kind: "queue", label: "Payment Queue", icon: "kafka" },
    { id: "ReceiptService", kind: "service", label: "Receipt Service", icon: "microservice" },
    { id: "StripeConnector", kind: "external", label: "Stripe" },
  ],
  channels: [
    { id: "ch-donate", source: "DonorApp", target: "APIGateway", label: "donate", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-process", source: "APIGateway", target: "DonationService", label: "process", delivery: "sync", relationship: "command", payloadKind: "command" },
    { source: "DonationService", target: "DonationDB", label: "record", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-campaign", source: "DonationService", target: "CampaignService", label: "update total", delivery: "sync", relationship: "command", payloadKind: "command" },
    { source: "CampaignService", target: "CampaignDB", label: "increment", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-pay", source: "DonationService", target: "PaymentQueue", label: "charge", delivery: "async", relationship: "event", payloadKind: "event" },
    { source: "PaymentQueue", target: "PaymentService", label: "process", delivery: "async", relationship: "event", payloadKind: "event" },
    { source: "PaymentService", target: "StripeConnector", label: "stripe charge", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-receipt", source: "PaymentService", target: "ReceiptService", label: "send receipt", delivery: "async", relationship: "event", payloadKind: "event" },
  ],
  scenarios: [
    { id: "don-donate", name: "Make Donation", steps: [
      { name: "Donate", channelId: "ch-donate", fromNode: "DonorApp", payloadType: "Donate", payloadData: { amount: 50, campaignId: "c1" } },
      { name: "Record Donation", channelId: "ch-process", fromNode: "APIGateway", payloadType: "CreateDonation", payloadData: { donationId: "d1" } },
      { name: "Update Campaign", channelId: "ch-campaign", fromNode: "DonationService", payloadType: "IncrementTotal", payloadData: { campaignId: "c1", amount: 50 } },
    ]},
    { id: "don-payment", name: "Process Payment", steps: [
      { name: "Enqueue Charge", channelId: "ch-pay", fromNode: "DonationService", payloadType: "ChargeEvent", payloadData: { donationId: "d1" } },
      { name: "Stripe Charge", description: "Payment processed via Stripe", visuals: [{ kind: "signal", targetId: "StripeConnector", color: "green" }] },
    ]},
    { id: "don-receipt", name: "Send Receipt", steps: [
      { name: "Generate Receipt", channelId: "ch-receipt", fromNode: "PaymentService", payloadType: "SendReceipt", payloadData: { email: "donor@example.com" } },
    ]},
  ],
});

export const githubActionsExample = defineExample({
  id: "github-actions",
  name: "GitHub Actions",
  difficulty: "community",
  description: "CI/CD pipeline runner with workflow dispatch, job queue, and containerized execution.",
  tags: ["ci-cd", "containers", "workflow"],
  patternsUsed: ["workflow-dag", "job-queue", "container-orchestration"],
  layoutHint: "pipeline",
  defaultScenarioId: "gha-trigger",
  columns: [
    ["GitPush"],
    ["WebhookReceiver"],
    ["WorkflowEngine"],
    ["WorkflowDB", "JobQueue"],
    ["RunnerPool"],
    ["ArtifactStore", "LogStream"],
    ["StatusService"],
  ],
  nodes: [
    { id: "GitPush", kind: "external", label: "Git Push" },
    { id: "WebhookReceiver", kind: "gateway", label: "Webhook Receiver" },
    { id: "WorkflowEngine", kind: "service", label: "Workflow Engine", icon: "microservice" },
    { id: "WorkflowDB", kind: "database", label: "Workflow DB", icon: "postgres" },
    { id: "JobQueue", kind: "queue", label: "Job Queue", icon: "kafka" },
    { id: "RunnerPool", kind: "service", label: "Runner Pool", icon: "microservice" },
    { id: "ArtifactStore", kind: "database", label: "Artifact Store", icon: "s3" },
    { id: "LogStream", kind: "queue", label: "Log Stream", icon: "kafka" },
    { id: "StatusService", kind: "service", label: "Status Service", icon: "microservice" },
  ],
  channels: [
    { id: "ch-push", source: "GitPush", target: "WebhookReceiver", label: "push event", delivery: "async", relationship: "event", payloadKind: "event" },
    { id: "ch-trigger", source: "WebhookReceiver", target: "WorkflowEngine", label: "trigger workflow", delivery: "sync", relationship: "command", payloadKind: "command" },
    { source: "WorkflowEngine", target: "WorkflowDB", label: "load workflow", delivery: "sync", relationship: "query", payloadKind: "query" },
    { id: "ch-dispatch", source: "WorkflowEngine", target: "JobQueue", label: "dispatch jobs", delivery: "async", relationship: "event", payloadKind: "event" },
    { source: "JobQueue", target: "RunnerPool", label: "execute", delivery: "async", relationship: "event", payloadKind: "event" },
    { id: "ch-artifact", source: "RunnerPool", target: "ArtifactStore", label: "upload artifact", delivery: "sync", relationship: "command", payloadKind: "command" },
    { id: "ch-logs", source: "RunnerPool", target: "LogStream", label: "stream logs", delivery: "async", relationship: "event", payloadKind: "event" },
    { source: "LogStream", target: "StatusService", label: "tail logs", delivery: "async", relationship: "event", payloadKind: "event" },
    { id: "ch-status", source: "WorkflowEngine", target: "StatusService", label: "update status", delivery: "sync", relationship: "command", payloadKind: "command" },
    { source: "RunnerPool", target: "WorkflowEngine", label: "job complete", delivery: "async", relationship: "event", payloadKind: "event" },
  ],
  scenarios: [
    { id: "gha-trigger", name: "Trigger Workflow", steps: [
      { name: "Git Push", channelId: "ch-push", fromNode: "GitPush", payloadType: "PushEvent", payloadData: { branch: "main", commit: "abc123" } },
      { name: "Match Workflow", channelId: "ch-trigger", fromNode: "WebhookReceiver", payloadType: "TriggerWorkflow", payloadData: { workflow: "ci.yml" } },
      { name: "Dispatch Jobs", channelId: "ch-dispatch", fromNode: "WorkflowEngine", payloadType: "DispatchJobs", payloadData: { jobs: ["build", "test"] } },
    ]},
    { id: "gha-run", name: "Execute Job", steps: [
      { name: "Pick Job", description: "Runner picks job from queue", visuals: [{ kind: "signal", targetId: "RunnerPool", color: "green" }] },
      { name: "Run in Container", description: "Job executes in isolated container", visuals: [{ kind: "highlight", targetId: "RunnerPool", color: "yellow" }] },
      { name: "Stream Logs", channelId: "ch-logs", fromNode: "RunnerPool", payloadType: "LogLine", payloadData: { line: "Tests passed" } },
    ]},
    { id: "gha-artifact", name: "Upload Artifact", steps: [
      { name: "Build Complete", channelId: "ch-artifact", fromNode: "RunnerPool", payloadType: "UploadArtifact", payloadData: { name: "dist.zip" } },
      { name: "Update Status", channelId: "ch-status", fromNode: "WorkflowEngine", payloadType: "JobComplete", payloadData: { job: "build", status: "success" } },
    ]},
  ],
});

export const communityExamples = [
  foodReviewAppExample,
  gameLeaderboardExample,
  donationsWebsiteExample,
  githubActionsExample,
  exponentialBackoffExample,
  exponentialBackoffDlqExample,
];
