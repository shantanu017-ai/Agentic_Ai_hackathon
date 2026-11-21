import {
  CloudAgentsError,
  createCloudAgentsClient,
  ensureCloudResources,
} from "./cloud-agents.mjs";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "./prompt.ts";

const CLOUD_ORIGIN = "https://api.qoder.com";
const SCOPE = "praxis.planner.v1";
const MAX_BODY_BYTES = 80 * 1024;
const REPLY_BUDGET_MS = 45_000;
const MAX_TEXT_CHARS = 20_000;
const RATE_WINDOW_MS = 5 * 60_000;
const RATE_LIMIT = 8;

type Task = "study" | "reteach" | "reflect";

type Binding = {
  agent: { type: "agent"; id: string; version: number };
  environment_id: string;
  model: string;
};

type Lease = {
  read(): Promise<unknown>;
  write(value: unknown): Promise<void>;
  assertHeld(): Promise<void>;
};

// Process-local lease. A cold start reconciles by resource metadata before any create.
const records = new Map<string, unknown>();
const locks = new Map<string, Promise<void>>();
const coordinator = {
  async withLock<T>(key: string, callback: (lease: Lease) => Promise<T>): Promise<T> {
    const previous = locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    locks.set(key, previous.then(() => gate));
    await previous;
    try {
      return await callback({
        read: async () => records.get(key) ?? null,
        write: async (value) => {
          records.set(key, value);
        },
        assertHeld: async () => {},
      });
    } finally {
      release();
    }
  },
};

const cloud = createCloudAgentsClient({ origin: CLOUD_ORIGIN });

let cached: Binding | null = null;
let pending: Promise<Binding> | null = null;

const hits = new Map<string, number[]>();

function allow(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 200) {
    for (const [entry, times] of hits) {
      if (!times.some((time) => now - time < RATE_WINDOW_MS)) hits.delete(entry);
    }
  }
  return true;
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("cf-connecting-ip") || "unknown";
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function fail(status: number, error: string) {
  return json(status, { error });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

function validateTask(value: unknown): value is Task {
  return value === "study" || value === "reteach" || value === "reflect";
}

function validateTopicList(topics: unknown, max: number) {
  if (!Array.isArray(topics) || topics.length < 1 || topics.length > max) return false;
  return topics.every((raw) => {
    const topic = asRecord(raw);
    return (
      typeof topic.id === "string" &&
      topic.id.length > 0 &&
      topic.id.length <= 80 &&
      typeof topic.name === "string" &&
      typeof topic.mastery === "number"
    );
  });
}

function validateEvidence(task: Task, evidence: unknown) {
  if (typeof evidence !== "object" || evidence === null) return false;
  if (task === "study") {
    const learner = asRecord(asRecord(evidence).learner);
    return (
      typeof learner.trackId === "string" &&
      typeof learner.minutes === "number" &&
      Number.isInteger(learner.minutes) &&
      learner.minutes >= 5 &&
      learner.minutes <= 60 &&
      Array.isArray(learner.topics) &&
      validateTopicList(learner.topics, 8) &&
      Array.isArray(learner.dueReviews) &&
      learner.dueReviews.length <= 8
    );
  }
  if (task === "reteach") {
    const classroom = asRecord(asRecord(evidence).classroom);
    return (
      validateTopicList(classroom.topics, 8) &&
      Array.isArray(classroom.misconceptions) &&
      classroom.misconceptions.length <= 12 &&
      Number.isInteger(classroom.students)
    );
  }
  const session = asRecord(asRecord(evidence).session);
  return (
    typeof session.answered === "number" &&
    Array.isArray(session.deltas) &&
    session.deltas.length <= 8 &&
    Array.isArray(asRecord(evidence).after) &&
    (asRecord(evidence).after as unknown[]).length <= 8
  );
}

async function pickModel() {
  const result = asRecord(await cloud.request("/api/v1/cloud/models"));
  const list = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.models)
      ? result.models
      : [];
  for (const raw of list) {
    const model = asRecord(raw);
    if (
      typeof model.id === "string" &&
      model.id.length > 0 &&
      model.enabled !== false &&
      model.status !== "disabled"
    ) {
      return model.id;
    }
  }
  throw new CloudAgentsError("ai_configuration_invalid", 503, "not_sent");
}

async function bootstrap(): Promise<Binding> {
  if (cached) return cached;
  if (pending) return pending;
  const created = (async (): Promise<Binding> => {
    const model = await pickModel();
    const binding = await ensureCloudResources({
      client: cloud,
      coordinator,
      applicationScope: SCOPE,
      agent: {
        name: "Praxis planning agent",
        model,
        system: SYSTEM_PROMPT,
        tools: [],
        metadata: {
          app: "praxis",
          purpose: "planning",
          definition: `praxis-planner-${PROMPT_VERSION}`,
        },
      },
      environment: {
        name: "Praxis planning sandbox",
        config: { type: "cloud" },
        metadata: { app: "praxis", purpose: "planning-sandbox" },
      },
    });
    const result: Binding = {
      agent: {
        type: "agent",
        id: String(binding.agent.id),
        version: Number(binding.agent.version),
      },
      environment_id: String(binding.environment_id),
      model,
    };
    cached = result;
    return result;
  })().finally(() => {
    pending = null;
  });
  pending = created;
  return created;
}

function extractText(content: unknown) {
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    const item = asRecord(block);
    if (item.type === "text" && typeof item.text === "string") parts.push(item.text);
  }
  return parts.join("").trim();
}

async function runPrompt(binding: Binding, task: Task, evidence: unknown) {
  const session = asRecord(
    await cloud.request("/api/v1/cloud/sessions", {
      method: "POST",
      body: {
        agent: binding.agent,
        environment_id: binding.environment_id,
        title: "Praxis planning run",
        metadata: { app: "praxis", purpose: "planning-run" },
      },
    }),
  );
  const sessionId = session.id;
  if (typeof sessionId !== "string" || !/^sess_[A-Za-z0-9_-]+$/.test(sessionId)) {
    return { failure: "invalid_session" as const };
  }

  await cloud.request(`/api/v1/cloud/sessions/${sessionId}/events`, {
    method: "POST",
    body: {
      events: [
        {
          type: "user.message",
          content: [
            {
              type: "text",
              text: JSON.stringify({ task, evidence }),
            },
          ],
        },
      ],
    },
  });

  const deadline = Date.now() + REPLY_BUDGET_MS;
  let wait = 900;
  while (Date.now() < deadline) {
    await sleep(wait);
    wait = Math.min(2000, Math.round(wait * 1.3));
    const page = asRecord(
      await cloud.request(
        `/api/v1/cloud/sessions/${sessionId}/events?order=asc&limit=100`,
      ),
    );
    const events = Array.isArray(page.data) ? page.data : [];
    for (const raw of events) {
      const event = asRecord(raw);
      const type = typeof event.type === "string" ? event.type : "";
      if (type === "agent.message") {
        const text = extractText(event.content);
        if (text.length > 0) {
          if (text.length > MAX_TEXT_CHARS) return { failure: "answer_too_large" as const };
          return { text };
        }
      }
      if (/error|failed|denied/i.test(type)) {
        return { failure: "agent_failed" as const };
      }
    }
  }
  return { failure: "timeout" as const };
}

function reasonFor(error: unknown) {
  if (error instanceof CloudAgentsError) {
    if (error.code === "ai_not_configured") return "not_configured";
    if (error.code === "ai_initialization_pending") return "initializing";
    if (error.code === "ai_rate_limited") return "rate_limited";
    if (error.code === "ai_access_denied") return "access_denied";
  }
  return "unavailable";
}

export async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET") {
    if (url.searchParams.get("action") === "health") {
      return json(200, {
        ok: true,
        configured: Boolean(Deno.env.get("QODER_PAT")),
        model: cached?.model ?? null,
      });
    }
    return fail(404, "not_found");
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, POST" },
    });
  }

  if (url.searchParams.get("action") !== "plan") return fail(404, "not_found");
  if (!allow(clientKey(request))) return fail(429, "rate_limited");

  const raw = await readBody(request);
  if (raw === null) return fail(413, "payload_too_large");
  let body: Record<string, unknown>;
  try {
    body = asRecord(JSON.parse(raw));
  } catch {
    return fail(400, "invalid_request");
  }

  const task = body.task;
  if (!validateTask(task)) return fail(400, "invalid_request");
  const evidence = body.evidence;
  if (!validateEvidence(task, evidence)) return fail(400, "invalid_request");
  if (JSON.stringify(evidence).length > 48 * 1024) return fail(413, "payload_too_large");

  if (!Deno.env.get("QODER_PAT")) {
    return json(200, { mode: "unavailable", reason: "not_configured" });
  }

  const startedAt = Date.now();
  try {
    const binding = await bootstrap();
    const result = await runPrompt(binding, task, evidence);
    if ("failure" in result) {
      console.error(JSON.stringify({ event: "praxis_agent_incomplete", reason: result.failure }));
      return json(200, { mode: "unavailable", reason: result.failure });
    }
    return json(200, {
      mode: "live",
      task,
      text: result.text,
      model: binding.model,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const reason = reasonFor(error);
    const code = error instanceof CloudAgentsError ? error.code : "unknown";
    console.error(JSON.stringify({ event: "praxis_agent_failed", reason, code }));
    return json(200, { mode: "unavailable", reason });
  }
}
