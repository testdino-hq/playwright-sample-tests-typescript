var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/reporter/index.ts
import { randomUUID } from "crypto";
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2, existsSync } from "fs";
import { readFile as readFile3, stat } from "fs/promises";
import { basename } from "path";
import { gzipSync } from "zlib";

// src/streaming/http.ts
import axios from "axios";

// src/reporter/errors.ts
var TestDinoServerError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "TestDinoServerError";
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
};
var QuotaExhaustedError = class extends TestDinoServerError {
  details;
  constructor(message, details) {
    super("QUOTA_EXHAUSTED", message);
    this.name = "QuotaExhaustedError";
    this.details = details;
  }
};
var QuotaExceededError = class extends TestDinoServerError {
  details;
  constructor(message, details) {
    super("QUOTA_EXCEEDED", message);
    this.name = "QuotaExceededError";
    this.details = details;
  }
};
var InvalidTokenTypeError = class extends TestDinoServerError {
  constructor(message) {
    super(
      "TOKEN_TYPE_NOT_ALLOWED",
      message ?? "This endpoint requires a pipeline API key (td_api_...). Personal access tokens and session cookies are not accepted."
    );
    this.name = "InvalidTokenTypeError";
  }
};
var ForbiddenAuthError = class extends TestDinoServerError {
  constructor(message) {
    super("AUTH_FORBIDDEN", message ?? "Authentication forbidden by server");
    this.name = "ForbiddenAuthError";
  }
};
var ServerEndpointError = class extends TestDinoServerError {
  constructor(path) {
    super(
      "WRONG_AUTH_ENDPOINT",
      `Server rejected POST ${path} (405 Method Not Allowed). Verify serverUrl points at the data-handler service.`
    );
    this.name = "ServerEndpointError";
  }
};
var UnauthorizedError = class extends TestDinoServerError {
  constructor(message) {
    super("UNAUTHORIZED", message ?? "Authentication failed \u2014 invalid or expired token");
    this.name = "UnauthorizedError";
  }
};
var HttpDeliveryError = class extends Error {
  status;
  constructor(status, message, options) {
    super(message, options);
    this.name = "HttpDeliveryError";
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
};
var PERMANENT_HTTP_STATUSES = /* @__PURE__ */ new Set([400, 401, 402, 403, 404, 405, 413]);
function isPermanentHttpStatus(status) {
  return status !== void 0 && PERMANENT_HTTP_STATUSES.has(status);
}
var EventTooLargeError = class extends HttpDeliveryError {
  count;
  constructor(message, options) {
    super(413, message, options);
    this.name = "EventTooLargeError";
    this.count = options?.count ?? 1;
  }
};
var PartialBatchError = class extends Error {
  failed;
  succeeded;
  constructor(failed, succeeded, message, options) {
    super(message, options);
    this.name = "PartialBatchError";
    this.failed = failed;
    this.succeeded = succeeded;
    Error.captureStackTrace(this, this.constructor);
  }
};
function isQuotaError(error) {
  return error instanceof QuotaExhaustedError || error instanceof QuotaExceededError;
}

// src/streaming/http.ts
var AUTH_PATH = "/api/v1/reporter/auth";
var VALID_SASL_MECHANISMS = ["plain", "scram-sha-256", "scram-sha-512"];
var HttpClient = class {
  client;
  constructor(options) {
    this.client = axios.create({
      baseURL: options.serverUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.token}`
      },
      timeout: 1e4
    });
  }
  async authenticate() {
    try {
      const response = await this.client.post(AUTH_PATH);
      return normalizeAuthResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 402) {
          const data = error.response.data;
          throw new QuotaExhaustedError(
            data?.message ?? "Quota exhausted",
            data?.details ?? { planName: "Unknown", totalLimit: 0, used: 0 }
          );
        }
        if (status === 403) {
          const data = error.response.data;
          if (data?.code === "TOKEN_TYPE_NOT_ALLOWED") throw new InvalidTokenTypeError(data.message);
          throw new ForbiddenAuthError(data?.message);
        }
        if (status === 401) {
          const data = error.response.data;
          throw new UnauthorizedError(data?.message);
        }
        if (status === 405) throw new ServerEndpointError(AUTH_PATH);
      }
      throw new Error(`Authentication failed: ${this.getErrorMessage(error)}`, { cause: error });
    }
  }
  async sendEvents(url, events) {
    try {
      await this.client.post(url, { events });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        const data = error.response.data;
        const details = data?.details;
        if (data?.error === "QUOTA_EXCEEDED" && details) {
          throw new QuotaExceededError(data.message || "Quota exceeded", details);
        }
        throw new QuotaExhaustedError(
          data?.message ?? "Quota exhausted",
          details ?? { planName: "Unknown", totalLimit: 0, used: 0 }
        );
      }
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpDeliveryError(error.response.status, this.getErrorMessage(error), { cause: error });
      }
      throw error;
    }
  }
  /** Returns null when the mapping is not recorded yet (404); throws otherwise. */
  async resolveRunLink(runId) {
    try {
      const response = await this.client.get(runLinkPath(runId));
      const url = response.data?.url;
      return typeof url === "string" && url.length > 0 ? url : null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpDeliveryError(error.response.status, this.getErrorMessage(error), { cause: error });
      }
      throw error;
    }
  }
  getErrorMessage(error) {
    if (axios.isAxiosError(error)) return error.response?.data?.message || error.message;
    if (error instanceof Error) return error.message;
    return String(error);
  }
};
function runLinkPath(runId) {
  return `/api/v1/reporter/runs/${encodeURIComponent(runId)}/link`;
}
function normalizeAuthResponse(raw) {
  const data = raw ?? {};
  if (!data.kafka?.sasl) return data;
  const lowered = data.kafka.sasl.mechanism.toLowerCase();
  if (!VALID_SASL_MECHANISMS.includes(lowered)) {
    throw new Error(`Unsupported SASL mechanism from server: ${data.kafka.sasl.mechanism}`);
  }
  return {
    ...data,
    kafka: {
      ...data.kafka,
      sasl: { ...data.kafka.sasl, mechanism: lowered }
    }
  };
}

// src/streaming/kafka.ts
import { Kafka, Partitioners } from "kafkajs";

// src/utils/logger.ts
function createNoopLogger() {
  return {
    success: () => {
    },
    info: () => {
    },
    warn: () => {
    },
    error: () => {
    },
    debug: () => {
    }
  };
}

// src/utils/kafka-timeout-warning.ts
var originalEmitWarning = null;
var patchedEmitWarning = null;
function isKafkaTimeoutNegativeWarning(name, stack) {
  return name === "TimeoutNegativeWarning" && (stack ?? "").includes("kafkajs");
}
function suppressKafkaTimeoutWarning() {
  if (patchedEmitWarning) return;
  const original = process.emitWarning;
  const callOriginal = original.bind(process);
  const patched = ((warning, ...rest) => {
    const type = typeof rest[0] === "string" ? rest[0] : rest[0]?.type;
    const name = warning instanceof Error ? warning.name : type;
    if (name === "TimeoutNegativeWarning" && isKafkaTimeoutNegativeWarning(name, new Error().stack ?? void 0)) {
      return;
    }
    callOriginal(warning, ...rest);
  });
  originalEmitWarning = original;
  patchedEmitWarning = patched;
  process.emitWarning = patched;
}
function restoreKafkaTimeoutWarning() {
  if (process.emitWarning !== patchedEmitWarning) return;
  if (originalEmitWarning) process.emitWarning = originalEmitWarning;
  originalEmitWarning = null;
  patchedEmitWarning = null;
}

// src/streaming/kafka.ts
var KafkaEventProducer = class {
  kafka;
  producer = null;
  channel;
  options;
  logger;
  connected = false;
  connectPromise = null;
  constructor(options) {
    this.options = options;
    this.channel = options.channel;
    this.logger = options.logger ?? createNoopLogger();
    this.kafka = new Kafka({
      clientId: options.clientId ?? "testdino-reporter",
      brokers: options.brokers,
      connectionTimeout: options.connectionTimeout ?? 1e4,
      requestTimeout: options.requestTimeout ?? 6e4,
      enforceRequestTimeout: true,
      ...options.sasl && { sasl: options.sasl },
      ...options.ssl !== void 0 && { ssl: options.ssl }
    });
  }
  async connect() {
    if (this.connected) return;
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }
  async doConnect() {
    suppressKafkaTimeoutWarning();
    const producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner
    });
    try {
      await producer.connect();
    } catch (error) {
      await producer.disconnect().catch(() => {
      });
      throw error;
    }
    this.producer = producer;
    this.connected = true;
    this.logger.debug(`Kafka connected to ${this.options.brokers.join(", ")}`);
  }
  async send(event) {
    const producer = this.producer;
    if (!producer) throw new Error("KafkaEventProducer not connected \u2014 call connect() first");
    try {
      return await producer.send({
        topic: this.channel,
        acks: 1,
        messages: [{ key: event.runId, value: JSON.stringify(event) }]
      });
    } catch (error) {
      this.connected = false;
      const orphaned = this.producer;
      this.producer = null;
      orphaned?.disconnect().catch(() => {
      });
      throw error;
    }
  }
  // On error: resets connected + nulls producer so the delivery-manager retry
  // reconnects with a fresh producer instance.
  async sendBatch(events) {
    const producer = this.producer;
    if (!producer) throw new Error("KafkaEventProducer not connected \u2014 call connect() first");
    if (events.length === 0) return [];
    try {
      return await producer.send({
        topic: this.channel,
        acks: 1,
        messages: events.map((event) => ({ key: event.runId, value: JSON.stringify(event) }))
      });
    } catch (error) {
      this.connected = false;
      const orphaned = this.producer;
      this.producer = null;
      orphaned?.disconnect().catch(() => {
      });
      throw error;
    }
  }
  async close() {
    if (this.producer) {
      const producer = this.producer;
      this.producer = null;
      this.connected = false;
      try {
        await producer.disconnect();
      } catch {
      }
      this.logger.debug("Kafka producer closed");
    }
    restoreKafkaTimeoutWarning();
  }
  get isConnected() {
    return this.connected;
  }
};

// src/utils/sizeOf.ts
function sizeOf(event) {
  try {
    return Buffer.byteLength(JSON.stringify(event));
  } catch {
    return 0;
  }
}

// src/streaming/buffer.ts
var EventBuffer = class {
  events = [];
  pendingBytes = 0;
  maxSize;
  maxBytes;
  flushIntervalMs;
  flushTimer = null;
  onFlush;
  flushPromise = null;
  logger;
  constructor(options) {
    this.maxSize = options.maxSize ?? 10;
    this.maxBytes = options.maxBytes ?? Number.POSITIVE_INFINITY;
    this.flushIntervalMs = options.flushIntervalMs ?? 250;
    this.onFlush = options.onFlush ?? (async () => {
    });
    this.logger = options.logger ?? createNoopLogger();
    this.startTimer();
  }
  // Sync path for test:end — void flush so a stuck Kafka send cannot block enqueue.
  enqueue(event) {
    this.events.push(event);
    this.pendingBytes += sizeOf(event);
    if (this.events.length >= this.maxSize || this.pendingBytes >= this.maxBytes) {
      void this.flush();
    }
  }
  async add(event) {
    this.events.push(event);
    this.pendingBytes += sizeOf(event);
    if (this.events.length >= this.maxSize || this.pendingBytes >= this.maxBytes) {
      await this.flush();
    }
  }
  async flush() {
    if (this.flushPromise) {
      try {
        await this.flushPromise;
      } catch {
      }
      if (this.events.length > 0) return this.flush();
      return;
    }
    if (this.events.length === 0) return;
    this.flushPromise = this.doFlush();
    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }
  async doFlush() {
    const eventsToFlush = [...this.events];
    const bytesToFlush = this.pendingBytes;
    this.events = [];
    this.pendingBytes = 0;
    try {
      await this.onFlush(eventsToFlush);
    } catch (error) {
      if (error instanceof PartialBatchError) {
        this.events = [...error.failed, ...this.events];
        this.pendingBytes += error.failed.reduce((sum, e) => sum + sizeOf(e), 0);
        this.logger.error(
          `Partial flush failure: ${error.succeeded} events delivered, ${error.failed.length} restored \u2014 ${error.message}`
        );
        throw error;
      }
      this.events = [...eventsToFlush, ...this.events];
      this.pendingBytes += bytesToFlush;
      this.logger.error(`Failed to flush events: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  size() {
    return this.events.length;
  }
  isEmpty() {
    return this.events.length === 0;
  }
  clear() {
    this.events = [];
    this.pendingBytes = 0;
  }
  startTimer() {
    if (this.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => {
        void this.flush();
      }, this.flushIntervalMs);
    }
  }
  // Does NOT flush — caller does a final explicit flush before destroy.
  destroy() {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
  getEvents() {
    return [...this.events];
  }
  // Sync take-and-reset (no await between) so an enqueue racing the returned batch's send is neither double-sent nor dropped.
  drain() {
    const events = this.events;
    this.events = [];
    this.pendingBytes = 0;
    return events;
  }
};

// src/streaming/delivery.ts
var HTTP_CHUNK_MAX_EVENTS = 900;
var HTTP_CHUNK_MAX_BYTES = 4 * 1024 * 1024;
var EventDeliveryManager = class {
  kafkaProducer;
  httpClient;
  httpFallbackUrl;
  maxAttempts;
  baseDelayMs;
  logger;
  kafkaHealthy = true;
  kafkaRecoveryThreshold;
  httpSuccessCount = 0;
  discardedCount = 0;
  lastDeliveryAt = 0;
  constructor(options) {
    this.kafkaProducer = options.kafkaProducer ?? null;
    this.httpClient = options.httpClient;
    this.httpFallbackUrl = options.httpFallbackUrl ?? null;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.logger = options.logger ?? createNoopLogger();
    this.kafkaRecoveryThreshold = options.kafkaRecoveryThreshold ?? 3;
  }
  async sendBatch(events) {
    if (events.length === 0) return;
    if (this.kafkaProducer && this.kafkaHealthy) {
      const kafkaSuccess = await this.tryKafkaWithRetry(events);
      if (kafkaSuccess) {
        this.lastDeliveryAt = Date.now();
        return;
      }
      this.kafkaHealthy = false;
      this.logger.warn("Kafka failed \u2014 switching to HTTP fallback");
    }
    await this.tryHttpWithRetry(events);
  }
  // run:end goes through here direct, never buffered — must stay last on the partition.
  async send(event) {
    await this.sendBatch([event]);
  }
  async tryKafkaWithRetry(events) {
    if (!this.kafkaProducer) return false;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        if (!this.kafkaProducer.isConnected) {
          this.logger.debug(`Kafka reconnect attempt ${attempt}/${this.maxAttempts}`);
          await this.kafkaProducer.connect();
        }
        await this.kafkaProducer.sendBatch(events);
        const first = events[0];
        const last = events[events.length - 1];
        const seqRange = "sequence" in first ? `(seq ${first.sequence}-${last.sequence})` : "";
        this.logger.debug(`Flushed ${events.length} events via kafka ${seqRange}`.trim());
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt < this.maxAttempts) {
          const delay = this.getBackoffDelay(attempt);
          this.logger.debug(
            `Kafka send failed: ${message} (attempt ${attempt}/${this.maxAttempts}, retrying in ${delay}ms)`
          );
          await this.sleep(delay);
        } else {
          this.logger.error(`Kafka delivery failed after ${this.maxAttempts} attempts: ${message}`);
        }
      }
    }
    return false;
  }
  async tryHttpWithRetry(events) {
    if (!this.httpFallbackUrl) {
      throw new Error("HTTP fallback not configured \u2014 server did not return httpFallback URL");
    }
    const fallbackUrl = this.httpFallbackUrl;
    const subBatches = chunkForHttp(events);
    let succeeded = 0;
    for (let i = 0; i < subBatches.length; i++) {
      const subBatch = subBatches[i];
      try {
        await this.sendSubBatchWithSplit(fallbackUrl, subBatch);
        succeeded += subBatch.length;
      } catch (error) {
        if (error instanceof EventTooLargeError) {
          this.discardedCount += error.count;
          continue;
        }
        if (isQuotaError(error)) throw error;
        if (succeeded === 0) throw error;
        const failed = subBatches.slice(i).flat();
        const message = error instanceof Error ? error.message : String(error);
        throw new PartialBatchError(
          failed,
          succeeded,
          `HTTP fallback failed at sub-batch ${i + 1}/${subBatches.length}: ${message}`,
          {
            cause: error
          }
        );
      }
    }
    const first = events[0];
    const last = events[events.length - 1];
    const seqRange = first && last && "sequence" in first ? `(seq ${first.sequence}-${last.sequence})` : "";
    this.logger.debug(
      `Flushed ${events.length} events via http in ${subBatches.length} sub-batches ${seqRange}`.trim()
    );
    this.lastDeliveryAt = Date.now();
    if (!this.kafkaHealthy) {
      this.httpSuccessCount++;
      if (this.httpSuccessCount >= this.kafkaRecoveryThreshold) {
        this.logger.debug(
          `HTTP success ${this.kafkaRecoveryThreshold}/${this.kafkaRecoveryThreshold} \u2014 probing Kafka recovery`
        );
        this.tryKafkaRecovery().catch(() => {
        });
      }
    }
  }
  async sendSubBatchWithSplit(url, events) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        await this.httpClient.sendEvents(url, events);
        return;
      } catch (error) {
        if (error instanceof HttpDeliveryError && error.status === 413 && events.length === 1) {
          this.logger.error(`Single event exceeds server cap (413) \u2014 discarding one event`);
          throw new EventTooLargeError("event exceeds server per-request cap", { cause: error });
        }
        if (error instanceof HttpDeliveryError && error.status === 413) {
          const mid = Math.floor(events.length / 2);
          this.logger.debug(`413 on ${events.length}-event sub-batch \u2014 halving into ${mid} + ${events.length - mid}`);
          const halves = [events.slice(0, mid), events.slice(mid)];
          let allTooLarge = true;
          let tooLargeCount = 0;
          for (const half of halves) {
            try {
              await this.sendSubBatchWithSplit(url, half);
              allTooLarge = false;
            } catch (halfError) {
              if (halfError instanceof EventTooLargeError) {
                tooLargeCount += halfError.count;
                continue;
              }
              throw halfError;
            }
          }
          if (allTooLarge) {
            throw new EventTooLargeError("all halves exceed server cap", { cause: error, count: tooLargeCount });
          }
          if (tooLargeCount > 0) this.discardedCount += tooLargeCount;
          return;
        }
        if (error instanceof HttpDeliveryError && isPermanentHttpStatus(error.status)) {
          this.logger.error(`HTTP fallback permanent error (${error.status}) \u2014 sub-batch discarded`);
          throw error;
        }
        if (isQuotaError(error)) {
          this.logger.error(`HTTP fallback permanent error (402 quota) \u2014 sub-batch discarded`);
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxAttempts) {
          const delay = this.getBackoffDelay(attempt);
          this.logger.debug(
            `HTTP sub-batch attempt ${attempt}/${this.maxAttempts} failed: ${lastError.message} (retrying in ${delay}ms)`
          );
          await this.sleep(delay);
        } else {
          this.logger.error(`HTTP sub-batch delivery failed after ${this.maxAttempts} attempts: ${lastError.message}`);
        }
      }
    }
    throw lastError ?? new Error("HTTP sub-batch delivery failed \u2014 no attempts made (maxAttempts must be >= 1)");
  }
  async tryKafkaRecovery() {
    if (!this.kafkaProducer) return;
    this.httpSuccessCount = 0;
    try {
      await this.kafkaProducer.connect();
      this.kafkaHealthy = true;
      this.logger.debug("Kafka connection recovered \u2014 resuming primary channel");
    } catch {
      this.logger.debug("Kafka recovery failed \u2014 staying on HTTP");
    }
  }
  getBackoffDelay(attempt) {
    return this.baseDelayMs * Math.pow(2, attempt - 1);
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  get activeChannel() {
    if (!this.kafkaProducer) return "http";
    return this.kafkaHealthy ? "kafka" : "http";
  }
  get discardCount() {
    return this.discardedCount;
  }
  // Monotonic — 0/negative counts are dropped so a caller bug can't silently
  // un-fail a run.
  recordDiscard(count) {
    if (count > 0) this.discardedCount += count;
  }
};
function chunkForHttp(events) {
  if (events.length === 0) return [];
  const chunks = [];
  let current = [];
  let currentBytes = 0;
  for (const event of events) {
    const eventBytes = sizeOf(event);
    const wouldExceedBytes = currentBytes + eventBytes > HTTP_CHUNK_MAX_BYTES && current.length > 0;
    const wouldExceedCount = current.length >= HTTP_CHUNK_MAX_EVENTS;
    if (wouldExceedBytes || wouldExceedCount) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(event);
    currentBytes += eventBytes;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// src/metadata/git.ts
import { readFile } from "fs/promises";
import { isAbsolute, normalize } from "path";

// src/utils/index.ts
import { relative } from "path";
function normalizePath(filePath, rootDir) {
  if (rootDir) {
    const root = rootDir.endsWith("/") ? rootDir.slice(0, -1) : rootDir;
    if (filePath === root || filePath.startsWith(`${root}/`)) {
      return relative(root, filePath);
    }
  }
  return filePath;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isDebugEnabled() {
  return process.env.TESTDINO_DEBUG === "true" || process.env.TESTDINO_DEBUG === "1";
}
async function withTimeout(promise, timeoutMs, operation) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// src/metadata/base.ts
var BaseMetadataCollector = class {
  name;
  constructor(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }
  async collect() {
    const result = await this.collectWithResult();
    return result.data;
  }
  async collectWithResult() {
    const startTime = Date.now();
    const collector = this.getName();
    try {
      const data = await this.collectMetadata();
      return {
        data,
        success: true,
        duration: Date.now() - startTime,
        collector
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`\u26A0\uFE0F  TestDino: ${collector} metadata collection failed:`, errorMessage);
      return {
        data: this.getEmptyMetadata(),
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        collector
      };
    }
  }
  async withTimeout(promise, timeoutMs, operation) {
    return withTimeout(promise, timeoutMs, operation);
  }
  safeJsonParse(jsonString, fallback) {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  }
  isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
};

// src/metadata/detect-ci-provider.ts
function detectCIProvider() {
  const { env } = process;
  if (env.GITHUB_ACTIONS === "true") return "github-actions";
  if (env.GITLAB_CI === "true") return "gitlab-ci";
  if (env.JENKINS_URL) return "jenkins";
  if (env.TF_BUILD === "True" || env.AZURE_HTTP_USER_AGENT) return "azure-devops";
  if (env.CIRCLECI === "true") return "circleci";
  if (env.CODEBUILD_BUILD_ID) return "aws-codebuild";
  if (env.BITBUCKET_BUILD_NUMBER) return "bitbucket-pipelines";
  if (env.BUILDKITE === "true") return "buildkite";
  if (env.HARNESS_BUILD_ID || env.HARNESS_PIPELINE_ID) return "harness";
  return void 0;
}

// src/metadata/git.ts
var execaPromise = null;
async function getExeca() {
  if (!execaPromise) {
    execaPromise = import("execa").then((m) => m.execa).catch((error) => {
      console.error("Failed to import execa:", error.message);
      execaPromise = null;
      throw new Error("Failed to load execa. Ensure execa is installed: npm install execa");
    });
  }
  return execaPromise;
}
var GIT_COMMAND_BUDGET_MS = 2500;
var GitMetadataCollector = class extends BaseMetadataCollector {
  options;
  constructor(options = {}) {
    super("git");
    this.options = {
      timeout: options.timeout || 3e3,
      cwd: options.cwd || process.cwd()
    };
  }
  /**
   * Collect git metadata
   */
  async collectMetadata() {
    const provider = detectCIProvider();
    const base2 = await this.collectGitCommandBase();
    const resolved = provider === "github-actions" ? await this.applyGitHubContext(base2) : this.applyCIEnvContext(base2, provider);
    const githubAuthor = await this.resolveGitHubAuthor(resolved.hash);
    if (!this.hasGitData(resolved, base2)) {
      return this.getEmptyMetadata();
    }
    return {
      branch: resolved.branch,
      commit: {
        hash: resolved.hash,
        message: resolved.message,
        author: githubAuthor.authorLogin || resolved.author,
        authorId: githubAuthor.authorId,
        email: resolved.email,
        timestamp: resolved.timestamp,
        isDirty: base2.isDirty
      },
      repository: {
        name: this.extractRepoName(resolved.repoUrl),
        url: resolved.repoUrl
      },
      ...resolved.pr ? { pr: resolved.pr } : {}
    };
  }
  /**
   * Whether any meaningful git/CI metadata was resolved. Used to preserve the
   * "empty when not a git repo and not in CI" contract.
   */
  hasGitData(resolved, base2) {
    return Boolean(
      resolved.branch || resolved.hash || resolved.message || resolved.author || resolved.email || resolved.repoUrl || resolved.pr || base2.isDirty !== void 0
    );
  }
  /**
   * Get empty metadata
   */
  getEmptyMetadata() {
    return {};
  }
  /**
   * Collect base git metadata. The GIT_COMMAND_BUDGET_MS bound is on how long we
   * *wait* (withTimeout is a Promise.race, not cancellation) — on timeout the
   * git subprocesses keep running detached and are reaped by execa's own
   * per-command `timeout: this.options.timeout`. We just stop awaiting and return
   * an empty base so a slow or CPU-starved runner can't discard CI env-derived
   * metadata (which needs no git subprocess).
   */
  async collectGitCommandBase() {
    try {
      return await this.withTimeout(this.runGitCommands(), GIT_COMMAND_BUDGET_MS, "git command metadata");
    } catch {
      return {};
    }
  }
  /**
   * Run the local git commands: fix CI ownership, verify the repo, then collect
   * branch/commit/url/dirty in parallel. Promise.allSettled isolates failures so
   * a single broken command never loses the rest of the data.
   */
  async runGitCommands() {
    await this.configureGitForCI();
    if (!await this.isGitRepository()) {
      return {};
    }
    const results = await Promise.allSettled([
      this.getBranch(),
      this.getCommitHash(),
      this.getCommitInfo(),
      this.getRepoUrl(),
      this.isDirtyWorkingTree()
    ]);
    const value = (index) => results[index]?.status === "fulfilled" ? results[index].value : void 0;
    const commitInfo = value(2);
    return {
      branch: value(0),
      hash: value(1),
      message: commitInfo?.message,
      author: commitInfo?.author,
      email: commitInfo?.email,
      timestamp: commitInfo?.timestamp,
      repoUrl: value(3),
      isDirty: value(4)
    };
  }
  /**
   * Apply GitHub Actions PR context over the git command base.
   * Overrides merge-commit data with the real PR head commit and builds rich
   * PR metadata from the event file.
   */
  async applyGitHubContext(base2) {
    const resolved = { ...base2 };
    const event = await this.readGitHubEventFile();
    const isPullRequest = process.env.GITHUB_EVENT_NAME === "pull_request";
    const branch = this.resolveGitHubBranch(isPullRequest, event);
    if (this.isNonEmptyString(branch)) {
      resolved.branch = branch;
    }
    if (isPullRequest && event?.pull_request) {
      resolved.pr = this.extractPRMetadata(event);
      const headSha = this.asString(event.pull_request.head?.sha);
      if (headSha) {
        resolved.hash = headSha;
        const realCommit = await this.getCommitInfoFromSha(headSha);
        if (realCommit) {
          resolved.message = realCommit.message ?? resolved.message;
          resolved.author = realCommit.author ?? resolved.author;
          resolved.email = realCommit.email ?? resolved.email;
          resolved.timestamp = realCommit.timestamp ?? resolved.timestamp;
        }
      }
    } else if (event?.head_commit) {
      const commit = event.head_commit;
      resolved.hash = this.asString(commit.id) ?? resolved.hash;
      resolved.message = this.asString(commit.message) ?? resolved.message;
      resolved.author = this.asString(commit.author?.name) ?? resolved.author;
      resolved.email = this.asString(commit.author?.email) ?? resolved.email;
      resolved.timestamp = this.asString(commit.timestamp) ?? resolved.timestamp;
    }
    if (!this.isNonEmptyString(resolved.hash)) {
      resolved.hash = this.asString(process.env.GITHUB_SHA) ?? resolved.hash;
    }
    if (!this.isNonEmptyString(resolved.repoUrl)) {
      resolved.repoUrl = this.resolveGitHubRepoUrl(event) ?? resolved.repoUrl;
    }
    return resolved;
  }
  /**
   * The branch that triggered a GitHub Actions run, from env/event only — never
   * the local git ref, which actions/checkout leaves detached ("HEAD").
   */
  resolveGitHubBranch(isPullRequest, event) {
    if (isPullRequest) {
      return this.asString(process.env.GITHUB_HEAD_REF) ?? this.asString(event?.pull_request?.head?.ref);
    }
    const refName = this.asString(process.env.GITHUB_REF_NAME);
    if (refName) return refName;
    const eventRef = this.asString(event?.ref);
    return eventRef ? this.extractBranchFromRef(eventRef) : void 0;
  }
  /**
   * Repo URL from GitHub env (GITHUB_SERVER_URL + GITHUB_REPOSITORY) or the event
   * payload, credentials stripped defensively.
   */
  resolveGitHubRepoUrl(event) {
    const serverUrl = this.asString(process.env.GITHUB_SERVER_URL);
    const repository = this.asString(process.env.GITHUB_REPOSITORY);
    if (serverUrl && repository) {
      return `${serverUrl}/${repository}`;
    }
    const htmlUrl = this.asString(event?.repository?.html_url);
    return htmlUrl ? this.stripCredentials(htmlUrl) : void 0;
  }
  asString(value) {
    return this.isNonEmptyString(value) ? value : void 0;
  }
  /**
   * Apply CI provider env vars over the git command base.
   *
   * For known CI providers env vars win (they describe the triggering ref,
   * which checkout may have rewritten). For local/unknown runs git wins and env
   * only fills gaps.
   */
  applyCIEnvContext(base2, provider) {
    const env = this.getEnvironmentGitInfo(provider);
    const prioritizeEnv = provider !== void 0;
    const pick = (envVal, gitVal) => prioritizeEnv ? envVal || gitVal : gitVal || envVal;
    return {
      branch: pick(env.branch, base2.branch),
      hash: pick(env.commitHash, base2.hash),
      message: pick(env.commitMessage, base2.message),
      author: pick(env.author, base2.author),
      email: pick(env.email, base2.email),
      timestamp: base2.timestamp,
      // env sources don't carry a timestamp
      repoUrl: pick(env.repoUrl, base2.repoUrl),
      pr: this.buildPRMetadata(env)
    };
  }
  /**
   * Map CI env PR fields onto the PRMetadata shape. Returns undefined when no
   * PR data is present.
   */
  buildPRMetadata(env) {
    const pr = {};
    if (env.prId) {
      const num = Number(env.prId);
      if (Number.isFinite(num)) pr.number = num;
    }
    if (env.prTitle) pr.title = env.prTitle;
    if (env.prUrl) pr.url = env.prUrl;
    if (env.prStatus) pr.status = env.prStatus;
    if (env.prBranch) pr.branch = env.prBranch;
    if (env.prTargetBranch) pr.targetBranch = env.prTargetBranch;
    return Object.keys(pr).length > 0 ? pr : void 0;
  }
  /**
   * Extract git metadata from CI provider environment variables. The
   * provider-specific block runs first, then generic CI vars fill any gaps.
   */
  getEnvironmentGitInfo(provider) {
    const info = {};
    switch (provider) {
      case "gitlab-ci":
        this.collectGitLabEnv(info);
        break;
      case "azure-devops":
        this.collectAzureDevOpsEnv(info);
        break;
      case "jenkins":
        this.collectJenkinsEnv(info);
        break;
      case "circleci":
        this.collectCircleCIEnv(info);
        break;
      case "aws-codebuild":
        this.collectAWSCodeBuildEnv(info);
        break;
      case "bitbucket-pipelines":
        this.collectBitbucketEnv(info);
        break;
      case "buildkite":
        this.collectBuildkiteEnv(info);
        break;
      case "harness":
        this.collectHarnessEnv(info);
        break;
      default:
        break;
    }
    this.collectGenericEnv(info);
    return info;
  }
  /**
   * GitLab CI env extraction
   */
  collectGitLabEnv(info) {
    const { env } = process;
    if (env.CI_COMMIT_BRANCH) info.branch = env.CI_COMMIT_BRANCH;
    else if (env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME) info.branch = env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;
    else if (env.CI_COMMIT_REF_NAME) info.branch = env.CI_COMMIT_REF_NAME;
    if (env.CI_COMMIT_SHA) info.commitHash = env.CI_COMMIT_SHA;
    if (env.CI_COMMIT_MESSAGE) info.commitMessage = env.CI_COMMIT_MESSAGE;
    if (env.CI_COMMIT_AUTHOR) info.author = env.CI_COMMIT_AUTHOR;
    if (env.CI_COMMIT_AUTHOR_EMAIL) info.email = env.CI_COMMIT_AUTHOR_EMAIL;
    if (env.CI_REPOSITORY_URL) info.repoUrl = this.cleanGitLabUrl(env.CI_REPOSITORY_URL);
    else if (env.CI_PROJECT_URL) info.repoUrl = env.CI_PROJECT_URL;
    if (env.CI_MERGE_REQUEST_IID) {
      info.prId = env.CI_MERGE_REQUEST_IID;
      if (env.CI_MERGE_REQUEST_TITLE) info.prTitle = env.CI_MERGE_REQUEST_TITLE;
      if (env.CI_PROJECT_URL) {
        info.prUrl = `${env.CI_PROJECT_URL}/-/merge_requests/${env.CI_MERGE_REQUEST_IID}`;
      }
      if (env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME) info.prBranch = env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME;
      if (env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME) info.prTargetBranch = env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
    }
  }
  /**
   * Azure DevOps env extraction
   */
  collectAzureDevOpsEnv(info) {
    const { env } = process;
    if (env.BUILD_REASON === "PullRequest" && env.SYSTEM_PULLREQUEST_SOURCEBRANCH) {
      info.branch = this.extractBranchFromRef(env.SYSTEM_PULLREQUEST_SOURCEBRANCH);
    } else if (env.BUILD_SOURCEBRANCH) {
      info.branch = this.extractBranchFromRef(env.BUILD_SOURCEBRANCH);
    } else if (env.BUILD_SOURCEBRANCHNAME) {
      info.branch = env.BUILD_SOURCEBRANCHNAME;
    }
    if (env.BUILD_SOURCEVERSION) info.commitHash = env.BUILD_SOURCEVERSION;
    if (env.BUILD_SOURCEVERSIONMESSAGE) info.commitMessage = env.BUILD_SOURCEVERSIONMESSAGE;
    if (env.BUILD_REQUESTEDFOR) info.author = env.BUILD_REQUESTEDFOR;
    if (env.BUILD_REQUESTEDFOREMAIL) info.email = env.BUILD_REQUESTEDFOREMAIL;
    if (env.BUILD_REPOSITORY_URI) info.repoUrl = this.cleanAzureDevOpsUrl(env.BUILD_REPOSITORY_URI);
    if (env.SYSTEM_PULLREQUEST_PULLREQUESTID) {
      info.prId = env.SYSTEM_PULLREQUEST_PULLREQUESTID;
      if (env.SYSTEM_PULLREQUEST_PULLREQUESTTITLE) info.prTitle = env.SYSTEM_PULLREQUEST_PULLREQUESTTITLE;
      if (env.SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI) {
        const cleaned = this.stripCredentials(env.SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI);
        if (cleaned) info.prUrl = `${cleaned}/pullrequest/${env.SYSTEM_PULLREQUEST_PULLREQUESTID}`;
      }
    }
  }
  /**
   * Jenkins env extraction (git-plugin + GitHub PR Builder plugin)
   */
  collectJenkinsEnv(info) {
    const { env } = process;
    const gitBranch = env.BRANCH_NAME || env.GIT_BRANCH;
    if (gitBranch) info.branch = gitBranch.replace("origin/", "");
    if (env.GIT_COMMIT) info.commitHash = env.GIT_COMMIT;
    if (env.GIT_AUTHOR_NAME) info.author = env.GIT_AUTHOR_NAME;
    if (env.GIT_AUTHOR_EMAIL) info.email = env.GIT_AUTHOR_EMAIL;
    if (env.GIT_URL) info.repoUrl = this.stripCredentials(env.GIT_URL);
    if (env.ghprbPullId) {
      info.prId = env.ghprbPullId;
      if (env.ghprbPullTitle) info.prTitle = env.ghprbPullTitle;
      if (env.ghprbPullLink) info.prUrl = this.stripCredentials(env.ghprbPullLink);
    }
  }
  /**
   * CircleCI env extraction
   */
  collectCircleCIEnv(info) {
    const { env } = process;
    if (env.CIRCLE_BRANCH) info.branch = env.CIRCLE_BRANCH;
    if (env.CIRCLE_SHA1) info.commitHash = env.CIRCLE_SHA1;
    if (env.CIRCLE_USERNAME) info.author = env.CIRCLE_USERNAME;
    if (env.CIRCLE_REPOSITORY_URL) {
      info.repoUrl = this.cleanCircleCIUrl(env.CIRCLE_REPOSITORY_URL);
    } else if (env.CIRCLE_PROJECT_USERNAME && env.CIRCLE_PROJECT_REPONAME) {
      const host = this.resolveCircleCIHost();
      if (host) info.repoUrl = `${host}/${env.CIRCLE_PROJECT_USERNAME}/${env.CIRCLE_PROJECT_REPONAME}`;
    }
    if (env.CIRCLE_PULL_REQUEST || env.CIRCLE_PR_NUMBER) {
      if (env.CIRCLE_PR_NUMBER) {
        info.prId = env.CIRCLE_PR_NUMBER;
      } else if (env.CIRCLE_PULL_REQUEST) {
        const prMatch = env.CIRCLE_PULL_REQUEST.match(/\/pull\/(\d+)$/);
        if (prMatch?.[1]) info.prId = prMatch[1];
      }
      if (env.CIRCLE_PULL_REQUEST) info.prUrl = this.stripCredentials(env.CIRCLE_PULL_REQUEST);
      if (!env.CIRCLE_TAG && env.CIRCLE_PULL_REQUEST) info.prStatus = "open";
    }
  }
  /**
   * AWS CodeBuild env extraction
   */
  collectAWSCodeBuildEnv(info) {
    const { env } = process;
    if (env.CODEBUILD_WEBHOOK_HEAD_REF) {
      info.branch = env.CODEBUILD_WEBHOOK_HEAD_REF.replace("refs/heads/", "");
    } else if (env.CODEBUILD_SOURCE_VERSION) {
      const sourceVersion = env.CODEBUILD_SOURCE_VERSION;
      if (!sourceVersion.startsWith("pr/") && !/^[0-9a-f]{40}$/.test(sourceVersion)) {
        info.branch = sourceVersion.replace("refs/heads/", "");
      }
    }
    if (env.CODEBUILD_RESOLVED_SOURCE_VERSION) info.commitHash = env.CODEBUILD_RESOLVED_SOURCE_VERSION;
    if (env.CODEBUILD_SOURCE_REPO_URL) info.repoUrl = this.convertCodeCommitToConsoleUrl(env.CODEBUILD_SOURCE_REPO_URL);
    if (env.CODEBUILD_WEBHOOK_TRIGGER) {
      const prMatch = env.CODEBUILD_WEBHOOK_TRIGGER.match(/^pr\/(\d+)$/);
      if (prMatch?.[1]) {
        info.prId = prMatch[1];
        info.prStatus = "open";
        if (env.CODEBUILD_SOURCE_REPO_URL) {
          info.prUrl = this.buildProviderPRUrl(env.CODEBUILD_SOURCE_REPO_URL, prMatch[1]);
        }
      }
    }
  }
  /**
   * Build a PR URL from a repo remote URL, parsing the hostname so
   * `github.com` doesn't false-positive against `evil-github.com.attacker.com`
   * and self-hosted / Enterprise hosts (`github.mycompany.com`,
   * `gitlab.internal`, `bitbucket-server.corp`) are still recognized.
   * Accepts HTTPS and SSH remotes (Buildkite's BUILDKITE_REPO is often SSH).
   * Returns undefined when the host is not recognizable — safer than a wrong
   * link.
   */
  buildProviderPRUrl(repoUrl, prId) {
    const normalized = this.normalizeRemoteToHttps(repoUrl);
    const cleaned = this.stripCredentials(normalized) ?? normalized;
    let host;
    try {
      host = new URL(cleaned).hostname.toLowerCase();
    } catch {
      return void 0;
    }
    if (host === "github.com" || host.endsWith(".github.com") || this.isAllowlistedHost(host, "TESTDINO_GHE_HOSTS")) {
      return `${cleaned}/pull/${prId}`;
    }
    if (host === "bitbucket.org" || host.endsWith(".bitbucket.org")) {
      return `${cleaned}/pull-requests/${prId}`;
    }
    if (host === "gitlab.com" || host.endsWith(".gitlab.com")) {
      return `${cleaned}/-/merge_requests/${prId}`;
    }
    return void 0;
  }
  /**
   * Normalize a git remote to an `https://host/path` form (no `.git` suffix) so
   * hostname parsing works uniformly. Handles SSH shorthand
   * (`git@host:org/repo.git`) and `ssh://` / `git://` remotes; HTTPS remotes are
   * returned unchanged apart from the `.git` strip. Credential stripping is left
   * to callers via stripCredentials — this only reshapes the transport.
   */
  normalizeRemoteToHttps(url) {
    const trimmed = url.trim();
    const sshShorthand = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/i);
    if (sshShorthand) return `https://${sshShorthand[1]}/${sshShorthand[2]}`;
    const sshProto = trimmed.match(/^(?:ssh|git):\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(?:\.git)?$/i);
    if (sshProto) return `https://${sshProto[1]}/${sshProto[2]}`;
    return trimmed.replace(/\.git$/, "");
  }
  /**
   * Optional user-supplied allowlist for self-hosted git provider hosts.
   * Format: `TESTDINO_GHE_HOSTS=host1,host2`. Empty / unset → no extra hosts.
   */
  isAllowlistedHost(host, envKey) {
    const raw = process.env[envKey];
    if (!raw) return false;
    return raw.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean).includes(host);
  }
  /**
   * Bitbucket Pipelines env extraction
   */
  collectBitbucketEnv(info) {
    const { env } = process;
    if (env.BITBUCKET_BRANCH) info.branch = env.BITBUCKET_BRANCH;
    if (env.BITBUCKET_COMMIT) info.commitHash = env.BITBUCKET_COMMIT;
    if (env.BITBUCKET_WORKSPACE && env.BITBUCKET_REPO_SLUG) {
      info.repoUrl = `https://bitbucket.org/${env.BITBUCKET_WORKSPACE}/${env.BITBUCKET_REPO_SLUG}`;
    } else if (env.BITBUCKET_GIT_HTTP_ORIGIN) {
      info.repoUrl = this.stripCredentials(env.BITBUCKET_GIT_HTTP_ORIGIN);
    }
    if (env.BITBUCKET_PR_ID) {
      info.prId = env.BITBUCKET_PR_ID;
      if (env.BITBUCKET_WORKSPACE && env.BITBUCKET_REPO_SLUG) {
        info.prUrl = `https://bitbucket.org/${env.BITBUCKET_WORKSPACE}/${env.BITBUCKET_REPO_SLUG}/pull-requests/${env.BITBUCKET_PR_ID}`;
      }
      info.prStatus = "open";
    }
  }
  /**
   * Buildkite env extraction.
   *
   * On PR builds the agent checks out a detached HEAD, so the local git branch
   * is unreliable — BUILDKITE_BRANCH carries the real triggering ref. BUILDKITE_REPO
   * may be SSH (`git@host:org/repo.git`) or HTTPS; the PR URL is reconstructed
   * from it host-aware so we never synthesise a wrong link.
   */
  collectBuildkiteEnv(info) {
    const { env } = process;
    if (env.BUILDKITE_BRANCH) info.branch = env.BUILDKITE_BRANCH;
    if (env.BUILDKITE_COMMIT && env.BUILDKITE_COMMIT !== "HEAD") info.commitHash = env.BUILDKITE_COMMIT;
    if (env.BUILDKITE_MESSAGE) info.commitMessage = env.BUILDKITE_MESSAGE;
    if (env.BUILDKITE_BUILD_AUTHOR) info.author = env.BUILDKITE_BUILD_AUTHOR;
    if (env.BUILDKITE_BUILD_AUTHOR_EMAIL) info.email = env.BUILDKITE_BUILD_AUTHOR_EMAIL;
    if (env.BUILDKITE_REPO) info.repoUrl = this.stripCredentials(this.normalizeRemoteToHttps(env.BUILDKITE_REPO));
    if (env.BUILDKITE_PULL_REQUEST && env.BUILDKITE_PULL_REQUEST !== "false") {
      info.prId = env.BUILDKITE_PULL_REQUEST;
      info.prBranch = env.BUILDKITE_BRANCH;
      if (env.BUILDKITE_PULL_REQUEST_BASE_BRANCH) info.prTargetBranch = env.BUILDKITE_PULL_REQUEST_BASE_BRANCH;
      if (env.BUILDKITE_REPO) info.prUrl = this.buildProviderPRUrl(env.BUILDKITE_REPO, env.BUILDKITE_PULL_REQUEST);
      info.prStatus = "open";
    }
  }
  /**
   * Harness CI env extraction.
   *
   * Harness CI is built on Drone and mirrors the documented DRONE_* vars into
   * the step container; those are the reliable source for git context (the
   * HARNESS_* vars cover pipeline/build identity only). On a PR build DRONE_BRANCH
   * is the target branch, so DRONE_SOURCE_BRANCH / DRONE_COMMIT_BRANCH are
   * preferred for the triggering ref.
   */
  collectHarnessEnv(info) {
    const { env } = process;
    if (env.DRONE_SOURCE_BRANCH) info.branch = env.DRONE_SOURCE_BRANCH;
    else if (env.DRONE_COMMIT_BRANCH) info.branch = env.DRONE_COMMIT_BRANCH;
    else if (env.DRONE_BRANCH) info.branch = env.DRONE_BRANCH;
    if (env.DRONE_COMMIT_SHA) info.commitHash = env.DRONE_COMMIT_SHA;
    if (env.DRONE_COMMIT_MESSAGE) info.commitMessage = env.DRONE_COMMIT_MESSAGE;
    if (env.DRONE_COMMIT_AUTHOR) info.author = env.DRONE_COMMIT_AUTHOR;
    if (env.DRONE_COMMIT_AUTHOR_EMAIL) info.email = env.DRONE_COMMIT_AUTHOR_EMAIL;
    if (env.DRONE_REPO_LINK) info.repoUrl = this.stripCredentials(this.normalizeRemoteToHttps(env.DRONE_REPO_LINK));
    if (env.DRONE_PULL_REQUEST) {
      info.prId = env.DRONE_PULL_REQUEST;
      if (env.DRONE_SOURCE_BRANCH) info.prBranch = env.DRONE_SOURCE_BRANCH;
      if (env.DRONE_TARGET_BRANCH) info.prTargetBranch = env.DRONE_TARGET_BRANCH;
      if (env.DRONE_REPO_LINK) info.prUrl = this.buildProviderPRUrl(env.DRONE_REPO_LINK, env.DRONE_PULL_REQUEST);
      info.prStatus = "open";
    }
  }
  /**
   * Generic CI env vars — only fills fields not already set by a provider
   */
  collectGenericEnv(info) {
    const { env } = process;
    if (!info.branch) info.branch = env.CI_BRANCH || env.BRANCH_NAME || env.GIT_BRANCH || void 0;
    if (!info.commitHash) info.commitHash = env.CI_COMMIT || env.COMMIT_SHA || env.GIT_COMMIT || void 0;
    if (!info.author) info.author = env.CI_AUTHOR || env.GIT_AUTHOR || env.COMMIT_AUTHOR || void 0;
    if (!info.repoUrl) {
      info.repoUrl = this.stripCredentials(env.CI_REPOSITORY_URL || env.REPOSITORY_URL || env.GIT_URL || void 0);
    }
  }
  /**
   * Extract a branch name from a git ref (refs/heads/main → main, refs/tags/v1 → v1)
   */
  extractBranchFromRef(ref) {
    if (ref.startsWith("refs/heads/")) return ref.slice("refs/heads/".length);
    if (ref.startsWith("refs/tags/")) return ref.slice("refs/tags/".length);
    return ref;
  }
  /**
   * Strip the gitlab-ci-token credentials from a GitLab repository URL
   */
  cleanGitLabUrl(url) {
    try {
      const urlObj = new URL(url);
      urlObj.username = "";
      urlObj.password = "";
      return urlObj.toString();
    } catch {
      return url.replace(/gitlab-ci-token:[^@]+@/, "");
    }
  }
  /**
   * Resolve the CircleCI project's host origin (https://<host>). Returns
   * undefined when no reliable signal is available so callers can skip
   * constructing a mislabeled URL rather than defaulting to github.com.
   */
  resolveCircleCIHost() {
    const { env } = process;
    const hostByType = {
      github: "https://github.com",
      gitlab: "https://gitlab.com",
      bitbucket: "https://bitbucket.org"
    };
    if (env.CIRCLE_PROJECT_TYPE) {
      const host = hostByType[env.CIRCLE_PROJECT_TYPE.toLowerCase()];
      if (host) return host;
    }
    if (env.CIRCLE_PULL_REQUEST) {
      try {
        return new URL(env.CIRCLE_PULL_REQUEST).origin;
      } catch {
      }
    }
    return void 0;
  }
  /**
   * Normalize a CircleCI repository URL: SSH → HTTPS, strip creds and .git
   */
  cleanCircleCIUrl(url) {
    if (!url) return "";
    try {
      if (url.startsWith("git@")) {
        const sshMatch = url.match(/git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
        if (sshMatch && sshMatch.length >= 4) {
          const [, host, user, repo] = sshMatch;
          return `https://${host}/${user}/${repo}`;
        }
      }
      const urlObj = new URL(url);
      urlObj.username = "";
      urlObj.password = "";
      if (urlObj.pathname.endsWith(".git")) {
        urlObj.pathname = urlObj.pathname.slice(0, -4);
      }
      return urlObj.toString();
    } catch {
      try {
        return url.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "").replace(/\/+$/, "");
      } catch {
        return url;
      }
    }
  }
  /**
   * Convert an AWS CodeCommit clone URL to its AWS Console repository URL
   */
  convertCodeCommitToConsoleUrl(url) {
    if (!url) return "";
    try {
      const match = url.match(/git-codecommit\.([^.]+)\.amazonaws\.com\/v1\/repos\/(.+?)(?:\.git)?$/);
      if (match?.[1] && match[2]) {
        const region = match[1];
        const repoName = match[2];
        return `https://${region}.console.aws.amazon.com/codesuite/codecommit/repositories/${repoName}`;
      }
    } catch {
    }
    return url;
  }
  /**
   * Generic credential-stripping for any URL that flows into `run:begin`.
   * Every user-visible URL emitted to ingestion (repository.url, pr.url) MUST
   * go through this — provider env vars routinely embed short-lived tokens
   * (Jenkins `GIT_URL`, Bitbucket `BITBUCKET_GIT_HTTP_ORIGIN`, Azure DevOps
   * `SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI`, and even the local
   * `git config remote.origin.url` when a dev clones with basic auth).
   * Persisted verbatim, those tokens live forever in ingestion JSONB and
   * render on the dashboard.
   *
   * The provider-specific cleaners (cleanGitLabUrl, cleanCircleCIUrl,
   * cleanAzureDevOpsUrl) still exist for provider-specific normalization
   * (SSH→HTTPS, .git-suffix stripping, ci-token regex fallback); they call
   * this as their credential-stripping primitive.
   */
  stripCredentials(url) {
    if (!url) return url;
    try {
      const parsed = new URL(url);
      parsed.username = "";
      parsed.password = "";
      return parsed.toString();
    } catch {
      return url.replace(/^([a-z][a-z0-9+.-]*):\/\/[^/@\s]*@/i, "$1://");
    }
  }
  /**
   * Strip credentials from an Azure DevOps repository URL (keeps encoding intact)
   */
  cleanAzureDevOpsUrl(url) {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      urlObj.username = "";
      urlObj.password = "";
      return urlObj.toString();
    } catch {
      try {
        return url.replace(/\/\/[^@]+@/, "//");
      } catch {
        return url;
      }
    }
  }
  /**
   * Configure git for CI environments — no-op after B3 (2026-07-04).
   *
   * Previously wrote `safe.directory` to the global config via `git config
   * --global`. That mutates ~/.gitconfig on shared CI runners and violated the
   * META-LOW-4/MED-13 findings. Replaced with per-invocation `-c
   * safe.directory=<cwd>` on `execGit()` — no global state, no accumulation.
   * Method kept as a stub so callers don't need to change.
   */
  async configureGitForCI() {
  }
  /**
   * Read and parse the GitHub Actions event file
   */
  async readGitHubEventFile() {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) return void 0;
    if (!isAbsolute(normalize(eventPath))) {
      console.warn("\u26A0\uFE0F  TestDino: GITHUB_EVENT_PATH is not an absolute path, skipping");
      return void 0;
    }
    try {
      const content = await this.withTimeout(
        readFile(eventPath, "utf-8"),
        this.options.timeout,
        "GitHub event file read"
      );
      return this.safeJsonParse(content, {});
    } catch (error) {
      console.warn(
        "\u26A0\uFE0F  TestDino: Failed to read GitHub event data:",
        error instanceof Error ? error.message : String(error)
      );
      return void 0;
    }
  }
  /**
   * Extract PR metadata from GitHub event data
   */
  extractPRMetadata(eventData) {
    const pullRequest = eventData?.pull_request;
    if (!pullRequest) return void 0;
    const prMetadata = {};
    if (this.isNonEmptyString(pullRequest.title)) {
      prMetadata.title = pullRequest.title;
    }
    if (typeof pullRequest.number === "number") {
      prMetadata.number = pullRequest.number;
    }
    if (this.isNonEmptyString(pullRequest.state)) {
      prMetadata.status = pullRequest.state;
    }
    const serverUrl = process.env.GITHUB_SERVER_URL;
    const repository = process.env.GITHUB_REPOSITORY;
    if (prMetadata.number && serverUrl && repository) {
      prMetadata.url = `${serverUrl}/${repository}/pull/${prMetadata.number}`;
    }
    if (pullRequest.head?.ref && this.isNonEmptyString(pullRequest.head.ref)) {
      prMetadata.branch = pullRequest.head.ref;
    }
    if (pullRequest.base?.ref && this.isNonEmptyString(pullRequest.base.ref)) {
      prMetadata.targetBranch = pullRequest.base.ref;
    }
    if (pullRequest.user?.login && this.isNonEmptyString(pullRequest.user.login)) {
      prMetadata.author = pullRequest.user.login;
    }
    if (Array.isArray(pullRequest.labels) && pullRequest.labels.length > 0) {
      const labels = pullRequest.labels.map((label) => label?.name).filter((name) => this.isNonEmptyString(name));
      if (labels.length > 0) {
        prMetadata.labels = labels;
      }
    }
    if (typeof pullRequest.merged === "boolean") {
      prMetadata.merged = pullRequest.merged;
    }
    if (typeof pullRequest.mergeable === "boolean") {
      prMetadata.mergeable = pullRequest.mergeable;
    }
    if (this.isNonEmptyString(pullRequest.merge_commit_sha)) {
      prMetadata.mergeCommitSha = pullRequest.merge_commit_sha;
    }
    const hasData = Object.keys(prMetadata).length > 0;
    return hasData ? prMetadata : void 0;
  }
  /**
   * Get commit details for a specific SHA using git show
   * Used to resolve real commit data in PR context (instead of merge commit)
   */
  async getCommitInfoFromSha(sha) {
    try {
      const result = await this.execGit(["show", "-s", "--format=%s%n%an%n%ae%n%aI", sha]);
      const lines = result.split("\n");
      if (lines.length < 4) return void 0;
      return {
        message: this.isNonEmptyString(lines[0]) ? lines[0] : void 0,
        author: this.isNonEmptyString(lines[1]) ? lines[1] : void 0,
        email: this.isNonEmptyString(lines[2]) ? lines[2] : void 0,
        timestamp: this.isNonEmptyString(lines[3]) ? lines[3] : void 0
      };
    } catch (error) {
      console.warn(
        "\u26A0\uFE0F  TestDino: Failed to get commit info from SHA:",
        error instanceof Error ? error.message : String(error)
      );
      return void 0;
    }
  }
  /**
   * Resolve GitHub author info via the Commits API.
   * Only runs on GitHub Actions where GITHUB_REPOSITORY is available.
   *
   * R3 (2026-07-04): honours GITHUB_API_URL (set by both public GitHub Actions
   * and GitHub Enterprise Server Actions). GITHUB_TOKEN is forwarded ONLY to
   * that same host — a GHES token must never be sent to api.github.com.
   * Users can disable the whole lookup with
   * TESTDINO_DISABLE_GITHUB_AUTHOR_LOOKUP=true.
   */
  async resolveGitHubAuthor(commitHash) {
    const empty = { authorId: "" };
    if (this.isGitHubAuthorLookupDisabled()) return empty;
    if (process.env.GITHUB_ACTIONS !== "true") return empty;
    if (!commitHash) return empty;
    const repository = process.env.GITHUB_REPOSITORY;
    if (!repository) return empty;
    const apiBase = this.resolveGitHubApiBase();
    const url = `${apiBase}/repos/${repository}/commits/${commitHash}`;
    try {
      const response = await this.withTimeout(
        fetch(url, { headers: this.buildGitHubHeaders(apiBase) }),
        this.options.timeout,
        "GitHub Commits API"
      );
      if (!response.ok) {
        return empty;
      }
      const data = await response.json();
      if (data?.author?.id) {
        const authorId = String(data.author.id);
        const authorLogin = this.isNonEmptyString(data.author.login) ? data.author.login : void 0;
        return { authorId, authorLogin };
      }
      return this.resolveGitHubAuthorFromActor();
    } catch (error) {
      console.warn(
        "\u26A0\uFE0F  TestDino: Failed to resolve GitHub author from Commits API:",
        error instanceof Error ? error.message : String(error)
      );
      return this.resolveGitHubAuthorFromActor();
    }
  }
  /**
   * True when the user opted out of remote author lookup entirely.
   * Honours TESTDINO_DISABLE_GITHUB_AUTHOR_LOOKUP = '1' | 'true' (case-insensitive).
   */
  isGitHubAuthorLookupDisabled() {
    const raw = process.env.TESTDINO_DISABLE_GITHUB_AUTHOR_LOOKUP;
    if (!raw) return false;
    const v = raw.toLowerCase();
    return v === "1" || v === "true";
  }
  /**
   * Resolve the GitHub API base URL. GitHub Actions on public GitHub sets
   * GITHUB_API_URL to https://api.github.com; on GitHub Enterprise Server it
   * sets the enterprise host (e.g. https://api.github.acme.com). Falling back
   * to the hard-coded public URL would silently break GHES author resolution
   * AND (with GITHUB_TOKEN forwarded unconditionally) leak the enterprise
   * bearer to a third-party host. Trailing slash trimmed.
   */
  resolveGitHubApiBase() {
    const raw = process.env.GITHUB_API_URL;
    if (this.isNonEmptyString(raw)) {
      return raw.replace(/\/+$/, "");
    }
    return "https://api.github.com";
  }
  /**
   * Build the GitHub API request headers. Authorization is attached ONLY when
   * the token is being sent to the same host GITHUB_API_URL resolves to — this
   * is the defense-in-depth guard on top of resolveGitHubApiBase(): even if a
   * misconfiguration leaves apiBase pointing at api.github.com on a GHES
   * runner, we won't forward the (unrelated) GHES token to it.
   */
  buildGitHubHeaders(apiBase) {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "testdino-playwright"
    };
    const token = process.env.GITHUB_TOKEN;
    if (!token) return headers;
    try {
      const apiHost = new URL(apiBase).hostname.toLowerCase();
      const rawApiUrl = process.env.GITHUB_API_URL;
      const envHost = this.isNonEmptyString(rawApiUrl) ? new URL(rawApiUrl).hostname.toLowerCase() : "api.github.com";
      if (apiHost === envHost) {
        headers.Authorization = `token ${token}`;
      }
    } catch {
    }
    return headers;
  }
  /**
   * Fallback: resolve GitHub author info from GITHUB_ACTOR via the Users API.
   * Uses the same GITHUB_API_URL + token-scope guard as resolveGitHubAuthor (R3).
   */
  async resolveGitHubAuthorFromActor() {
    if (this.isGitHubAuthorLookupDisabled()) return { authorId: "" };
    const actor = process.env.GITHUB_ACTOR;
    if (!actor) {
      return { authorId: "" };
    }
    const apiBase = this.resolveGitHubApiBase();
    const url = `${apiBase}/users/${actor}`;
    try {
      const response = await this.withTimeout(
        fetch(url, { headers: this.buildGitHubHeaders(apiBase) }),
        this.options.timeout,
        "GitHub Users API"
      );
      if (!response.ok) {
        return { authorId: "" };
      }
      const data = await response.json();
      const authorId = data?.id ? String(data.id) : "";
      const authorLogin = this.isNonEmptyString(data?.login) ? data.login : actor;
      return { authorId, authorLogin };
    } catch (error) {
      console.warn(
        "\u26A0\uFE0F  TestDino: Failed to resolve GitHub author from GITHUB_ACTOR:",
        error instanceof Error ? error.message : String(error)
      );
      return { authorId: "" };
    }
  }
  /**
   * Check if current directory is a git repository
   */
  async isGitRepository() {
    try {
      await this.execGit(["rev-parse", "--git-dir"]);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get current branch name
   * Uses: git rev-parse --abbrev-ref HEAD
   */
  async getBranch() {
    try {
      const result = await this.execGit(["rev-parse", "--abbrev-ref", "HEAD"]);
      return this.isNonEmptyString(result) ? result : void 0;
    } catch {
      return void 0;
    }
  }
  /**
   * Get current commit hash (full SHA)
   * Uses: git rev-parse HEAD
   */
  async getCommitHash() {
    try {
      const result = await this.execGit(["rev-parse", "HEAD"]);
      return this.isNonEmptyString(result) ? result : void 0;
    } catch {
      return void 0;
    }
  }
  /**
   * Get commit message, author name, email, and timestamp in a single git process.
   * Uses: git log -1 --pretty=format:%s%n%an%n%ae%n%aI
   */
  async getCommitInfo() {
    try {
      const result = await this.execGit(["log", "-1", "--pretty=format:%s%n%an%n%ae%n%aI"]);
      const lines = result.split("\n");
      if (lines.length < 4) return void 0;
      return {
        message: this.isNonEmptyString(lines[0]) ? lines[0] : void 0,
        author: this.isNonEmptyString(lines[1]) ? lines[1] : void 0,
        email: this.isNonEmptyString(lines[2]) ? lines[2] : void 0,
        timestamp: this.isNonEmptyString(lines[3]) ? lines[3] : void 0
      };
    } catch {
      return void 0;
    }
  }
  /**
   * Get remote origin URL
   * Uses: git config --get remote.origin.url
   */
  async getRepoUrl() {
    try {
      const result = await this.execGit(["config", "--get", "remote.origin.url"]);
      if (!this.isNonEmptyString(result)) return void 0;
      return this.stripCredentials(result);
    } catch {
      return void 0;
    }
  }
  /**
   * Check if working tree has uncommitted changes
   * Uses: git status --porcelain
   * Returns true if there are any changes (staged, unstaged, or untracked)
   */
  async isDirtyWorkingTree() {
    try {
      const result = await this.execGit(["status", "--porcelain"]);
      return result.trim().length > 0;
    } catch {
      return void 0;
    }
  }
  /**
   * Extract repository name from remote URL
   * e.g., "https://github.com/user/repo.git" → "repo"
   */
  extractRepoName(repoUrl) {
    if (!repoUrl) return void 0;
    return repoUrl.split("/").pop()?.replace(".git", "") || void 0;
  }
  /**
   * Execute git command with timeout.
   *
   * `-c safe.directory=<cwd>` is prepended in CI so a workspace mounted with
   * different ownership (a common Docker / GitHub-Actions runner shape)
   * doesn't trigger the dubious-ownership refusal. `-c` is per-invocation and
   * writes NOTHING to `~/.gitconfig` — safe on shared runners.
   */
  async execGit(args) {
    const execa = await getExeca();
    const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
    const finalArgs = isCI ? ["-c", `safe.directory=${this.options.cwd}`, ...args] : args;
    const { stdout } = await execa("git", finalArgs, {
      cwd: this.options.cwd,
      timeout: this.options.timeout,
      reject: true
    });
    return stdout.trim();
  }
};

// src/metadata/ci.ts
import { type as osType, release as osRelease } from "os";
var CIMetadataCollector = class extends BaseMetadataCollector {
  constructor() {
    super("ci");
  }
  /**
   * Collect CI metadata
   */
  async collectMetadata() {
    const provider = detectCIProvider();
    if (!provider) {
      return {
        provider: "local",
        environment: this.collectEnvironment()
      };
    }
    const { pipeline, build } = this.getProviderMetadata(provider);
    return {
      provider,
      pipeline,
      build,
      environment: this.collectEnvironment()
    };
  }
  /**
   * Get empty metadata
   */
  getEmptyMetadata() {
    return {};
  }
  /**
   * Route to the provider-specific pipeline/build extractor
   */
  getProviderMetadata(provider) {
    switch (provider) {
      case "github-actions":
        return this.getGitHubActionsMetadata();
      case "gitlab-ci":
        return this.getGitLabCIMetadata();
      case "circleci":
        return this.getCircleCIMetadata();
      case "jenkins":
        return this.getJenkinsMetadata();
      case "azure-devops":
        return this.getAzureDevOpsMetadata();
      case "aws-codebuild":
        return this.getAWSCodeBuildMetadata();
      case "bitbucket-pipelines":
        return this.getBitbucketPipelinesMetadata();
      case "buildkite":
        return this.getBuildkiteMetadata();
      case "harness":
        return this.getHarnessMetadata();
      default:
        return this.getGenericMetadata();
    }
  }
  /**
   * GitHub Actions pipeline + build
   */
  getGitHubActionsMetadata() {
    const { env } = process;
    return {
      pipeline: {
        id: env.GITHUB_RUN_ID,
        name: env.GITHUB_WORKFLOW,
        url: this.buildGitHubPipelineUrl()
      },
      build: {
        number: env.GITHUB_RUN_NUMBER,
        trigger: env.GITHUB_EVENT_NAME
      }
    };
  }
  /**
   * Build the GitHub Actions pipeline URL when all parts are present
   */
  buildGitHubPipelineUrl() {
    const { env } = process;
    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = env;
    if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
      return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
    }
    return void 0;
  }
  /**
   * GitLab CI pipeline + build
   */
  getGitLabCIMetadata() {
    const { env } = process;
    return {
      pipeline: {
        id: env.CI_PIPELINE_ID,
        name: this.getGitLabPipelineName(),
        url: env.CI_PIPELINE_URL
      },
      build: {
        number: env.CI_JOB_ID || env.CI_PIPELINE_IID,
        trigger: env.CI_PIPELINE_SOURCE
      }
    };
  }
  /**
   * Derive a human-readable GitLab pipeline name
   */
  getGitLabPipelineName() {
    const { CI_PIPELINE_SOURCE, CI_COMMIT_TITLE, CI_PIPELINE_NAME } = process.env;
    if (CI_PIPELINE_SOURCE) return `${CI_PIPELINE_SOURCE} pipeline`;
    return CI_COMMIT_TITLE || CI_PIPELINE_NAME || void 0;
  }
  /**
   * CircleCI pipeline + build
   */
  getCircleCIMetadata() {
    const { env } = process;
    return {
      pipeline: {
        id: env.CIRCLE_PIPELINE_ID || env.CIRCLE_BUILD_NUM,
        name: env.CIRCLE_JOB,
        url: env.CIRCLE_BUILD_URL
      },
      build: {
        number: env.CIRCLE_BUILD_NUM,
        trigger: this.getCircleCIBuildTrigger()
      }
    };
  }
  /**
   * Determine CircleCI build trigger from available env vars
   */
  getCircleCIBuildTrigger() {
    const { env } = process;
    if (env.CIRCLE_TAG) return "tag";
    if (env.CIRCLE_PR_NUMBER || env.CIRCLE_PULL_REQUEST) return "pr";
    return "push";
  }
  /**
   * Jenkins pipeline + build
   */
  getJenkinsMetadata() {
    const { env } = process;
    return {
      pipeline: {
        id: env.BUILD_ID,
        name: env.JOB_NAME,
        url: env.BUILD_URL
      },
      build: {
        number: env.BUILD_NUMBER,
        trigger: this.getJenkinsBuildTrigger()
      }
    };
  }
  /**
   * Jenkins doesn't expose a single BUILD_CAUSE env var — it exposes each cause
   * as a separate boolean (BUILD_CAUSE_MANUALTRIGGER, BUILD_CAUSE_SCMTRIGGER,
   * etc.) that the Groovy env-vars plugin sets. Prefer these; fall back to the
   * legacy BUILD_CAUSE if a customer sets it manually in their pipeline.
   */
  getJenkinsBuildTrigger() {
    const { env } = process;
    if (env.BUILD_CAUSE_MANUALTRIGGER === "true") return "manual";
    if (env.BUILD_CAUSE_SCMTRIGGER === "true") return "push";
    if (env.BUILD_CAUSE_TIMERTRIGGER === "true") return "scheduled";
    if (env.BUILD_CAUSE_UPSTREAMTRIGGER === "true") return "upstream";
    if (env.BUILD_CAUSE_REMOTECAUSE === "true") return "remote";
    return env.BUILD_CAUSE;
  }
  /**
   * Azure DevOps pipeline + build
   */
  getAzureDevOpsMetadata() {
    const { env } = process;
    return {
      pipeline: {
        id: env.BUILD_BUILDID,
        name: env.BUILD_DEFINITIONNAME,
        url: this.buildAzureDevOpsPipelineUrl()
      },
      build: {
        number: env.BUILD_BUILDNUMBER,
        trigger: env.BUILD_REASON
      }
    };
  }
  /**
   * Construct the Azure DevOps build-results URL when all parts are present
   */
  buildAzureDevOpsPipelineUrl() {
    const { SYSTEM_TEAMFOUNDATIONSERVERURI, SYSTEM_TEAMPROJECT, BUILD_BUILDID } = process.env;
    if (!SYSTEM_TEAMFOUNDATIONSERVERURI || !SYSTEM_TEAMPROJECT || !BUILD_BUILDID) {
      return void 0;
    }
    try {
      const baseUrl = SYSTEM_TEAMFOUNDATIONSERVERURI.replace(/\/$/, "");
      const encodedProject = encodeURIComponent(SYSTEM_TEAMPROJECT);
      return `${baseUrl}/${encodedProject}/_build/results?buildId=${BUILD_BUILDID}`;
    } catch {
      return void 0;
    }
  }
  /**
   * AWS CodeBuild pipeline + build
   */
  getAWSCodeBuildMetadata() {
    const { env } = process;
    const buildId = env.CODEBUILD_BUILD_ID || "";
    const projectName = buildId.split(":")[0] || void 0;
    return {
      pipeline: {
        id: env.CODEBUILD_BUILD_ID,
        name: projectName,
        url: env.CODEBUILD_BUILD_URL
      },
      build: {
        number: env.CODEBUILD_BUILD_NUMBER,
        trigger: this.getAWSCodeBuildTrigger()
      }
    };
  }
  /**
   * Determine the AWS CodeBuild trigger from webhook/initiator env vars
   */
  getAWSCodeBuildTrigger() {
    const { env } = process;
    if (env.CODEBUILD_WEBHOOK_EVENT) return env.CODEBUILD_WEBHOOK_EVENT;
    if (env.CODEBUILD_INITIATOR) {
      return env.CODEBUILD_INITIATOR.startsWith("codepipeline/") ? "codepipeline" : "manual";
    }
    return void 0;
  }
  /**
   * Bitbucket Pipelines pipeline + build
   */
  getBitbucketPipelinesMetadata() {
    const { env } = process;
    const { BITBUCKET_WORKSPACE, BITBUCKET_REPO_SLUG, BITBUCKET_BUILD_NUMBER } = env;
    const url = BITBUCKET_WORKSPACE && BITBUCKET_REPO_SLUG && BITBUCKET_BUILD_NUMBER ? `https://bitbucket.org/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pipelines/results/${BITBUCKET_BUILD_NUMBER}` : void 0;
    let trigger = "push";
    if (env.BITBUCKET_PR_ID) {
      trigger = "pull_request";
    } else if (env.BITBUCKET_TAG) {
      trigger = "tag";
    }
    return {
      pipeline: {
        id: env.BITBUCKET_PIPELINE_UUID,
        name: "Bitbucket Pipeline",
        url
      },
      build: {
        number: BITBUCKET_BUILD_NUMBER,
        trigger
      }
    };
  }
  /**
   * Buildkite pipeline + build
   */
  getBuildkiteMetadata() {
    const { env } = process;
    return {
      pipeline: {
        id: env.BUILDKITE_PIPELINE_ID || env.BUILDKITE_PIPELINE_SLUG,
        name: env.BUILDKITE_PIPELINE_NAME || env.BUILDKITE_PIPELINE_SLUG,
        url: env.BUILDKITE_BUILD_URL
      },
      build: {
        number: env.BUILDKITE_BUILD_NUMBER,
        trigger: this.getBuildkiteTrigger()
      }
    };
  }
  /**
   * Determine the Buildkite trigger. BUILDKITE_PULL_REQUEST is the PR number or
   * the literal string 'false' when the build is not for a PR.
   *
   * BUILDKITE_SOURCE describes what started the build (webhook, ui, api,
   * schedule, trigger_job). It's normalized to the same push/manual/scheduled
   * vocabulary the other providers emit — an ordinary git push arrives as
   * 'webhook', which would otherwise leak as a trigger value. Unknown sources
   * pass through so no signal is lost.
   */
  getBuildkiteTrigger() {
    const { env } = process;
    if (env.BUILDKITE_TAG) return "tag";
    if (env.BUILDKITE_PULL_REQUEST && env.BUILDKITE_PULL_REQUEST !== "false") return "pull_request";
    switch (env.BUILDKITE_SOURCE) {
      case void 0:
      case "":
      case "webhook":
        return "push";
      case "ui":
        return "manual";
      case "schedule":
        return "scheduled";
      default:
        return env.BUILDKITE_SOURCE;
    }
  }
  /**
   * Harness CI pipeline + build.
   *
   * Harness CI is built on Drone and mirrors the documented DRONE_* vars into
   * the step container; those are the reliable source for build number and
   * trigger. The HARNESS_* vars carry pipeline identity. The results URL is
   * account/module-specific and not reliably reconstructable from env, so it is
   * left undefined. `name` is omitted rather than duplicating the identifier —
   * Harness exposes no distinct pipeline-name env var.
   */
  getHarnessMetadata() {
    const { env } = process;
    return {
      pipeline: {
        id: env.HARNESS_PIPELINE_ID
      },
      build: {
        number: env.HARNESS_BUILD_ID || env.DRONE_BUILD_NUMBER,
        trigger: this.getHarnessTrigger()
      }
    };
  }
  /**
   * Normalize the Harness/Drone build event. Drone emits 'cron' for scheduled
   * builds; align it with the 'scheduled' vocabulary the other providers use.
   * Other events (push, pull_request, tag) pass through unchanged.
   */
  getHarnessTrigger() {
    const event = process.env.DRONE_BUILD_EVENT;
    if (!event) return void 0;
    return event === "cron" ? "scheduled" : event;
  }
  /**
   * Fallback for a detected-but-unmapped CI provider.
   *
   * Kept intentionally narrow: only reads env vars that are truly widely-shared
   * across generic CI images (CI_BUILD_NUMBER, BUILD_NUMBER). Does NOT leak
   * GitLab-specific vars (CI_PIPELINE_ID / CI_PIPELINE_NAME / CI_PIPELINE_URL /
   * CI_PIPELINE_SOURCE), which would falsely attribute an unknown provider's
   * run to GitLab semantics in the dashboard.
   */
  getGenericMetadata() {
    const { env } = process;
    return {
      pipeline: {},
      build: {
        number: env.CI_BUILD_NUMBER || env.BUILD_NUMBER
      }
    };
  }
  /**
   * Collect runner environment information
   */
  collectEnvironment() {
    try {
      return {
        name: osType(),
        type: process.platform,
        os: `${osType()} ${osRelease()}`,
        node: process.version
      };
    } catch {
      return {};
    }
  }
  /**
   * Reconcile CI and Git metadata after both collectors complete.
   *
   * Bitbucket Pipelines runs that fire on the target branch after a PR merge do
   * not expose `BITBUCKET_PR_ID`, so env-only detection reports `push`. The
   * auto-merge commit subject (`Merged in <branch> (pull request #N)`) is the
   * reliable signal that the push originated from a PR — when present we surface
   * the run as a `pull_request` trigger and backfill PR number/url/status/title.
   *
   * No-op for every other provider.
   */
  static reconcileWithGit(ci, git) {
    if (ci.provider !== "bitbucket-pipelines") return;
    if (ci.build?.trigger !== "push") return;
    const message = git.commit?.message || "";
    const match = message.match(/^Merged in [^\n]+\(pull request #(\d+)\)/i);
    const prId = match?.[1];
    if (!prId) return;
    if (ci.build) ci.build.trigger = "pull_request";
    const pr = git.pr ?? {};
    if (pr.number === void 0) {
      pr.number = Number(prId);
      if (git.repository?.url) {
        const base2 = git.repository.url.replace(/\.git$/, "").replace(/\/$/, "");
        pr.url = `${base2}/pull-requests/${prId}`;
      }
      pr.status = "merged";
      pr.merged = true;
    }
    if (!pr.title) {
      const subject = message.split("\n")[0]?.trim();
      if (subject) pr.title = subject;
    }
    git.pr = pr;
  }
};

// src/metadata/system.ts
import { platform, release, cpus, totalmem, hostname } from "os";
import { version } from "process";
var SystemMetadataCollector = class extends BaseMetadataCollector {
  constructor(_options = {}) {
    super("system");
  }
  async collectMetadata() {
    return {
      os: this.getOperatingSystem(),
      cpu: this.getCpuInfo(),
      memory: this.getMemoryInfo(),
      nodeVersion: this.getNodeVersion(),
      platform: this.getPlatform(),
      hostname: this.getHostname()
    };
  }
  getEmptyMetadata() {
    return {};
  }
  getOperatingSystem() {
    let platformName = "unknown";
    let releaseVersion = "unknown";
    try {
      platformName = platform();
    } catch {
    }
    try {
      releaseVersion = release();
    } catch {
    }
    return `${platformName} ${releaseVersion}`;
  }
  getCpuInfo() {
    try {
      const cpuList = cpus();
      if (cpuList.length === 0) return "unknown";
      return `${cpuList[0].model.trim()} (${cpuList.length} cores)`;
    } catch {
      return "unknown";
    }
  }
  getMemoryInfo() {
    try {
      return `${(totalmem() / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    } catch {
      return "unknown";
    }
  }
  getNodeVersion() {
    try {
      return version;
    } catch {
      return "unknown";
    }
  }
  getPlatform() {
    try {
      return platform();
    } catch {
      return "unknown";
    }
  }
  getHostname() {
    try {
      return hostname();
    } catch {
      return "unknown";
    }
  }
};

// src/metadata/playwright.ts
import { readFile as readFile2 } from "fs/promises";
var PlaywrightMetadataCollector = class extends BaseMetadataCollector {
  options;
  constructor(options = {}) {
    super("playwright");
    this.options = {
      timeout: options.timeout || 3e3,
      config: options.config,
      suite: options.suite,
      packageJsonPath: options.packageJsonPath
    };
  }
  async collectMetadata() {
    const metadata = {};
    const version2 = await this.getPlaywrightVersion();
    if (version2) metadata.version = version2;
    if (this.options.config) {
      Object.assign(metadata, this.extractConfigMetadata(this.options.config));
    }
    return metadata;
  }
  getEmptyMetadata() {
    return {};
  }
  async getPlaywrightVersion() {
    try {
      const packageJsonPath = this.options.packageJsonPath || this.resolvePlaywrightPackageJson();
      if (!packageJsonPath) return void 0;
      const content = await this.withTimeout(
        readFile2(packageJsonPath, "utf-8"),
        this.options.timeout,
        "Playwright package.json read"
      );
      const packageJson = this.safeJsonParse(content, {});
      return this.isNonEmptyString(packageJson.version) ? packageJson.version : void 0;
    } catch (error) {
      console.warn(
        "\u26A0\uFE0F  TestDino: Failed to read Playwright version:",
        error instanceof Error ? error.message : String(error)
      );
      return void 0;
    }
  }
  resolvePlaywrightPackageJson() {
    try {
      return __require.resolve("@playwright/test/package.json");
    } catch {
      return void 0;
    }
  }
  extractConfigMetadata(config) {
    const metadata = {};
    if (this.isNonEmptyString(config.configFile)) metadata.configFile = config.configFile;
    if (typeof config.forbidOnly === "boolean") metadata.forbidOnly = config.forbidOnly;
    if (typeof config.fullyParallel === "boolean") {
      metadata.fullyParallel = config.fullyParallel;
      metadata.parallel = config.fullyParallel;
    }
    if (typeof config.globalTimeout === "number") metadata.globalTimeout = config.globalTimeout;
    if (config.grep) {
      const patterns = Array.isArray(config.grep) ? config.grep : [config.grep];
      metadata.grep = patterns.map((p) => p.source);
    }
    if (typeof config.maxFailures === "number") metadata.maxFailures = config.maxFailures;
    if (config.metadata && typeof config.metadata === "object") metadata.metadata = config.metadata;
    if (typeof config.workers === "number") metadata.workers = config.workers;
    if (Array.isArray(config.projects) && config.projects.length > 0) {
      const projectConfigs = config.projects.filter((project) => this.isNonEmptyString(project.name)).map((project) => this.extractProjectConfig(project));
      if (projectConfigs.length > 0) {
        metadata.projects = projectConfigs;
        const browsers = this.extractBrowsersFromProjects(config.projects);
        if (browsers.length > 0) metadata.browsers = browsers;
      }
    }
    if (config.reportSlowTests && typeof config.reportSlowTests === "object") {
      metadata.reportSlowTests = {
        max: config.reportSlowTests.max,
        threshold: config.reportSlowTests.threshold
      };
    }
    if (this.isNonEmptyString(config.rootDir)) metadata.rootDir = config.rootDir;
    if (config.shard && typeof config.shard.current === "number" && typeof config.shard.total === "number") {
      metadata.shard = { current: config.shard.current, total: config.shard.total };
    }
    if (Array.isArray(config.tags) && config.tags.length > 0) metadata.tags = config.tags;
    if (config.webServer && typeof config.webServer === "object") {
      metadata.webServer = config.webServer;
    }
    return metadata;
  }
  extractProjectConfig(project) {
    const config = { name: project.name || "" };
    if (this.isNonEmptyString(project.testDir)) config.testDir = project.testDir;
    if (typeof project.timeout === "number") config.timeout = project.timeout;
    if (typeof project.retries === "number") config.retries = project.retries;
    if (typeof project.repeatEach === "number" && project.repeatEach > 1) config.repeatEach = project.repeatEach;
    if (Array.isArray(project.dependencies) && project.dependencies.length > 0) {
      config.dependencies = project.dependencies;
    }
    if (project.grep) {
      const patterns = Array.isArray(project.grep) ? project.grep : [project.grep];
      const grepStrings = patterns.map((p) => p.source);
      if (grepStrings.length > 0) config.grep = grepStrings;
    }
    if (project.use) {
      const useOptions = this.extractUseOptions(project.use);
      if (Object.keys(useOptions).length > 0) config.use = useOptions;
    }
    return config;
  }
  extractUseOptions(use) {
    const options = {};
    if (!use) return options;
    if (this.isNonEmptyString(use.channel)) options.channel = use.channel;
    const browserName = this.resolveBrowserName(use.browserName, use.defaultBrowserType, use.channel);
    if (browserName) options.browserName = browserName;
    if (typeof use.headless === "boolean") options.headless = use.headless;
    if (use.viewport && typeof use.viewport === "object") {
      options.viewport = { width: use.viewport.width, height: use.viewport.height };
    } else if (use.viewport === null) {
      options.viewport = null;
    }
    if (this.isNonEmptyString(use.baseURL)) options.baseURL = use.baseURL;
    const trace = this.normalizeArtifactMode(use.trace);
    if (trace) options.trace = trace;
    const screenshot = this.normalizeArtifactMode(use.screenshot);
    if (screenshot) options.screenshot = screenshot;
    const video = this.normalizeArtifactMode(use.video);
    if (video) options.video = video;
    if (typeof use.isMobile === "boolean") options.isMobile = use.isMobile;
    if (this.isNonEmptyString(use.locale)) options.locale = use.locale;
    return options;
  }
  // trace/screenshot/video can be string or { mode: string }.
  normalizeArtifactMode(value) {
    if (!value) return void 0;
    if (typeof value === "string" && value !== "off") return value;
    if (typeof value === "object" && value !== null && "mode" in value) {
      const mode = value.mode;
      if (mode && mode !== "off") return mode;
    }
    return void 0;
  }
  // Priority: explicit browserName > defaultBrowserType (device presets) > channel inference.
  resolveBrowserName(browserName, defaultBrowserType, channel) {
    const validBrowsers = ["chromium", "firefox", "webkit"];
    if (browserName && validBrowsers.includes(browserName)) {
      return browserName;
    }
    if (defaultBrowserType && validBrowsers.includes(defaultBrowserType)) {
      return defaultBrowserType;
    }
    if (channel) {
      const chromiumChannels = [
        "chrome",
        "chrome-beta",
        "chrome-dev",
        "chrome-canary",
        "msedge",
        "msedge-beta",
        "msedge-dev",
        "msedge-canary"
      ];
      if (chromiumChannels.includes(channel)) return "chromium";
    }
    return void 0;
  }
  extractBrowsersFromProjects(projects) {
    const browsers = /* @__PURE__ */ new Set();
    for (const project of projects) {
      const browserName = this.resolveBrowserName(
        project.use?.browserName,
        project.use?.defaultBrowserType,
        project.use?.channel
      );
      if (browserName) browsers.add(browserName);
    }
    return Array.from(browsers);
  }
  buildSkeleton(suite) {
    return {
      totalTests: suite.allTests().length,
      suites: this.buildSuiteTree(suite)
    };
  }
  buildSuiteTree(suite) {
    const suites = [];
    for (const childSuite of suite.suites) {
      const skeletonSuite = {
        title: childSuite.title,
        type: childSuite.type === "file" ? "file" : "describe",
        tests: childSuite.tests.map((test2) => this.buildSkeletonTest(test2))
      };
      if (childSuite.type === "file" && childSuite.location) {
        skeletonSuite.file = normalizePath(childSuite.location.file, this.options.config?.rootDir);
      }
      if (childSuite.location) {
        skeletonSuite.location = {
          file: normalizePath(childSuite.location.file, this.options.config?.rootDir),
          line: childSuite.location.line,
          column: childSuite.location.column
        };
      }
      if (childSuite.suites.length > 0) {
        skeletonSuite.suites = this.buildSuiteTree(childSuite);
      }
      suites.push(skeletonSuite);
    }
    return suites;
  }
  buildSkeletonTest(test2) {
    const skeletonTest = {
      testId: test2.id,
      title: test2.title,
      location: {
        file: normalizePath(test2.location.file, this.options.config?.rootDir),
        line: test2.location.line,
        column: test2.location.column
      }
    };
    if (test2.tags && test2.tags.length > 0) skeletonTest.tags = test2.tags;
    if (test2.expectedStatus) skeletonTest.expectedStatus = test2.expectedStatus;
    if (test2.annotations && test2.annotations.length > 0) {
      skeletonTest.annotations = test2.annotations.map((ann) => ({
        type: ann.type,
        description: ann.description
      }));
    }
    return skeletonTest;
  }
};

// src/metadata/index.ts
var DEFAULT_METADATA_OPTIONS = {
  timeout: 5e3,
  debug: false
};
var MetadataAggregator = class {
  options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collectors = [];
  playwrightCollector;
  constructor(options = {}) {
    this.options = { ...DEFAULT_METADATA_OPTIONS, ...options };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerCollector(collector) {
    this.collectors.push(collector);
    if (collector instanceof PlaywrightMetadataCollector) {
      this.playwrightCollector = collector;
    }
  }
  buildSkeleton(suite) {
    if (!this.playwrightCollector) return void 0;
    return this.playwrightCollector.buildSkeleton(suite);
  }
  async collectAll() {
    const startTime = Date.now();
    const settledResults = await Promise.allSettled(
      this.collectors.map(
        (collector) => this.withTimeout(collector.collectWithResult(), this.options.timeout, "Metadata collection")
      )
    );
    const results = [];
    const metadata = {};
    for (const settledResult of settledResults) {
      if (settledResult.status === "fulfilled") {
        const result = settledResult.value;
        results.push(result);
        this.aggregateMetadata(metadata, result);
      } else {
        const error = settledResult.reason;
        console.warn("\u26A0\uFE0F  TestDino: Metadata collector promise rejected:", error);
        results.push({
          data: {},
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
          collector: "unknown"
        });
      }
    }
    if (metadata.ci && metadata.git) {
      CIMetadataCollector.reconcileWithGit(metadata.ci, metadata.git);
    }
    const totalDuration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    return {
      metadata,
      results,
      totalDuration,
      successCount,
      failureCount: results.length - successCount
    };
  }
  aggregateMetadata(metadata, result) {
    const { collector, data } = result;
    switch (collector) {
      case "git":
        metadata.git = data;
        break;
      case "ci":
        metadata.ci = data;
        break;
      case "system":
        metadata.system = data;
        break;
      case "playwright":
        metadata.playwright = data;
        break;
      default:
        if (this.options.debug) {
          console.warn(`\u26A0\uFE0F  TestDino: Unknown metadata collector: ${collector}`);
        }
    }
  }
  async withTimeout(promise, timeoutMs, operation) {
    return withTimeout(promise, timeoutMs, operation);
  }
};
function createMetadataCollector(playwrightConfig, playwrightSuite) {
  const aggregator = new MetadataAggregator();
  aggregator.registerCollector(new GitMetadataCollector());
  aggregator.registerCollector(new CIMetadataCollector());
  aggregator.registerCollector(new SystemMetadataCollector());
  aggregator.registerCollector(
    new PlaywrightMetadataCollector({
      config: playwrightConfig,
      suite: playwrightSuite
    })
  );
  return aggregator;
}

// src/types/index.ts
var DEFAULT_SERVER_URL = "https://reporter.testdino.com";

// src/uploads/artifact-upload-client.ts
import axios2, { isAxiosError } from "axios";
import { extname } from "path";
var DEFAULT_ALLOWED_FILE_TYPES = ["png", "jpeg", "jpg", "webm", "zip", "json", "txt", "md"];
function isAllowedExtension(fileName, allowed = DEFAULT_ALLOWED_FILE_TYPES) {
  const ext = extname(fileName).slice(1).toLowerCase();
  return ext.length > 0 && allowed.includes(ext);
}
var DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024;
function isWithinSizeLimit(sizeBytes, max = DEFAULT_MAX_SIZE_BYTES) {
  return sizeBytes <= max;
}
var PERMANENT_CLIENT_STATUSES = [400, 401, 403, 404, 405];
var ArtifactUploadTokenError = class extends Error {
  kind;
  httpStatus;
  serverCode;
  constructor(message, kind, httpStatus, serverCode) {
    super(message);
    this.name = "ArtifactUploadTokenError";
    this.kind = kind;
    this.httpStatus = httpStatus;
    this.serverCode = serverCode;
  }
};
var ArtifactPutError = class extends Error {
  kind;
  httpStatus;
  constructor(message, kind, httpStatus) {
    super(message);
    this.name = "ArtifactPutError";
    this.kind = kind;
    this.httpStatus = httpStatus;
  }
};
var ArtifactUploadClient = class {
  http;
  runId;
  maxAttempts;
  retryDelay;
  putTimeout;
  onDebug;
  constructor(options) {
    this.runId = options.runId;
    this.maxAttempts = options.maxAttempts ?? 2;
    this.retryDelay = options.retryDelay ?? 1e3;
    this.putTimeout = options.putTimeout ?? 6e4;
    this.onDebug = options.onDebug ?? (() => {
    });
    this.http = axios2.create({
      baseURL: options.serverUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.token}`
      },
      timeout: options.tokenRequestTimeout ?? 1e4
    });
  }
  async requestUploadTokens(files) {
    if (files.length === 0) {
      throw new ArtifactUploadTokenError("Cannot request upload tokens for an empty batch", "client");
    }
    const body = {
      files: files.map((f) => ({
        name: f.name,
        test_id: f.testId,
        content_type: f.contentType,
        size_bytes: f.sizeBytes
      }))
    };
    const path = `/api/v1/reporter/runs/${encodeURIComponent(this.runId)}/artifacts/upload-token`;
    let lastError = null;
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        this.onDebug(`upload-token request attempt ${attempt + 1}/${this.maxAttempts} (files=${files.length})`);
        const response = await this.http.post(path, body);
        return {
          uploads: response.data.uploads.map((u) => ({
            attachmentId: u.attachment_id,
            blobKey: u.blob_key,
            uploadUrl: u.upload_url
          })),
          expiresAt: response.data.expires_at,
          maxSizeBytes: response.data.max_size_bytes,
          allowedFileTypes: response.data.allowed_file_types
        };
      } catch (error) {
        const classified = classifyTokenError(error);
        lastError = classified;
        if (classified.kind === "client") {
          this.onDebug(
            `upload-token permanent client error (${classified.httpStatus ?? "?"}/${classified.serverCode ?? "?"}) \u2014 not retrying`
          );
          throw classified;
        }
        if (attempt < this.maxAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          this.onDebug(
            `upload-token transient failure (kind=${classified.kind}, status=${classified.httpStatus ?? "?"}) \u2014 retrying in ${delay}ms`
          );
          await sleep(delay);
        }
      }
    }
    throw lastError ?? new ArtifactUploadTokenError("Upload-token request failed", "network");
  }
  async uploadFile(uploadUrl, body, contentType) {
    let lastError = null;
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        await this.doPut(uploadUrl, body, contentType);
        return;
      } catch (error) {
        const classified = classifyPutError(error);
        lastError = classified;
        if (classified.kind === "client") {
          this.onDebug(`PUT permanent client error (${classified.httpStatus ?? "?"}) \u2014 not retrying`);
          throw classified;
        }
        if (attempt < this.maxAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          this.onDebug(
            `PUT transient failure (kind=${classified.kind}, status=${classified.httpStatus ?? "?"}) \u2014 retrying in ${delay}ms`
          );
          await sleep(delay);
        }
      }
    }
    throw lastError ?? new ArtifactPutError("Artifact PUT failed", "network");
  }
  // Buffer, not stream: caller snapshots before token round-trip so a file
  // Playwright cleans up mid-run can't vanish under an in-flight PUT.
  async doPut(uploadUrl, body, contentType) {
    await axios2.put(uploadUrl, body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": body.length,
        "x-ms-blob-type": "BlockBlob"
      },
      timeout: this.putTimeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  }
};
function classifyTokenError(error) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const body = error.response?.data;
    const code = body?.error?.code;
    const message2 = body?.error?.message ?? error.message;
    if (status !== void 0 && PERMANENT_CLIENT_STATUSES.includes(status)) {
      return new ArtifactUploadTokenError(message2, "client", status, code);
    }
    if (status === 503) return new ArtifactUploadTokenError(message2, "storage", status, code);
    if (status !== void 0 && status >= 500) {
      return new ArtifactUploadTokenError(message2, "server_error", status, code);
    }
    if (status !== void 0 && status >= 400) {
      return new ArtifactUploadTokenError(message2, "client", status, code);
    }
    return new ArtifactUploadTokenError(message2, "network");
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ArtifactUploadTokenError(message, "network");
}
function classifyPutError(error) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message2 = error.message;
    if (status !== void 0 && PERMANENT_CLIENT_STATUSES.includes(status)) {
      return new ArtifactPutError(message2, "client", status);
    }
    if (status === 429) return new ArtifactPutError(message2, "server_error", status);
    if (status !== void 0 && status >= 500) return new ArtifactPutError(message2, "server_error", status);
    if (status !== void 0 && status >= 400) return new ArtifactPutError(message2, "client", status);
    return new ArtifactPutError(message2, "network");
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ArtifactPutError(message, "network");
}

// src/code-coverage/merger.ts
import istanbulCoverage from "istanbul-lib-coverage";
import picomatch from "picomatch";
function toIstanbulMapData(map) {
  return map;
}
function fromIstanbulMapData(data) {
  return data;
}
var CoverageMerger = class {
  coverageMap = istanbulCoverage.createCoverageMap({});
  hasData = false;
  isIncluded;
  isExcluded;
  onError;
  constructor(options) {
    if (options?.include && options.include.length > 0) {
      this.isIncluded = picomatch(options.include);
    }
    if (options?.exclude && options.exclude.length > 0) {
      this.isExcluded = picomatch(options.exclude);
    }
    this.onError = options?.onError;
  }
  addFragment(fragment) {
    if (!fragment.istanbul) return;
    try {
      const filtered = this.filterCoverageMap(fragment.istanbul);
      this.coverageMap.merge(toIstanbulMapData(filtered));
      if (this.coverageMap.files().length > 0) {
        this.hasData = true;
      }
    } catch (error) {
      const msg = `[TestDino] Failed to merge coverage fragment: ${error instanceof Error ? error.message : String(error)}`;
      if (this.onError) {
        this.onError(msg);
      } else {
        console.warn(msg);
      }
    }
  }
  filterCoverageMap(coverageMap) {
    if (!this.isIncluded && !this.isExcluded) return coverageMap;
    const filtered = {};
    for (const [filePath, fileCoverage] of Object.entries(coverageMap)) {
      if (this.isExcluded && this.isExcluded(filePath)) {
        continue;
      }
      if (this.isIncluded && !this.isIncluded(filePath)) {
        continue;
      }
      filtered[filePath] = fileCoverage;
    }
    return filtered;
  }
  get hasCoverage() {
    return this.hasData;
  }
  computeSummary() {
    const globalSummary = this.coverageMap.getCoverageSummary();
    return {
      lines: extractMetric(globalSummary.lines),
      branches: extractMetric(globalSummary.branches),
      functions: extractMetric(globalSummary.functions),
      statements: extractMetric(globalSummary.statements)
    };
  }
  computeFileCoverage(gitRoot) {
    const root = gitRoot || process.cwd();
    return this.coverageMap.files().map((filePath) => {
      const fileCoverage = this.coverageMap.fileCoverageFor(filePath);
      const fileSummary = fileCoverage.toSummary();
      const normalizedPath = normalizePath(filePath, root);
      return {
        path: normalizedPath,
        lines: extractMetric(fileSummary.lines),
        branches: extractMetric(fileSummary.branches),
        functions: extractMetric(fileSummary.functions),
        statements: extractMetric(fileSummary.statements)
      };
    });
  }
  getRawCoverageMap() {
    return this.coverageMap;
  }
  toJSON() {
    return fromIstanbulMapData(this.coverageMap.toJSON());
  }
};
function extractMetric(metric) {
  return {
    total: metric.total,
    covered: metric.covered,
    pct: metric.pct
  };
}

// src/code-coverage/compact.ts
import { createHash } from "crypto";
function extractCompactCounts(coverageMapJSON, gitRoot) {
  const files = {};
  for (const [filePath, fileCoverage] of Object.entries(coverageMapJSON)) {
    const normalizedPath = normalizePath(filePath, gitRoot);
    files[normalizedPath] = {
      s: { ...fileCoverage.s },
      f: { ...fileCoverage.f },
      b: Object.fromEntries(Object.entries(fileCoverage.b).map(([k, v]) => [k, [...v]])),
      totals: {
        s: Object.keys(fileCoverage.statementMap || {}).length,
        f: Object.keys(fileCoverage.fnMap || {}).length,
        b: countBranchPaths(fileCoverage.branchMap || {})
      },
      shapeHash: computeShapeHash(fileCoverage)
    };
  }
  return { files, fileCount: Object.keys(files).length };
}
function countBranchPaths(branchMap) {
  let total = 0;
  for (const branch of Object.values(branchMap)) {
    total += (branch.locations || []).length;
  }
  return total;
}
function computeShapeHash(fileCoverage) {
  const branchMap = fileCoverage.branchMap || {};
  const shape = {
    s: Object.keys(fileCoverage.statementMap || {}).length,
    f: Object.keys(fileCoverage.fnMap || {}).length,
    b: countBranchPaths(branchMap),
    bp: Object.values(branchMap).map((b) => (b.locations || []).length)
  };
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex").slice(0, 12);
}

// src/code-coverage/html-report.ts
import { createContext } from "istanbul-lib-report";
import { create as createReporter } from "istanbul-reports";
import { mkdir, rm } from "fs/promises";
async function generateIstanbulHtmlReport(coverageMerger, options) {
  await rm(options.outputDir, { recursive: true, force: true }).catch(() => {
  });
  await mkdir(options.outputDir, { recursive: true });
  const coverageMap = coverageMerger.getRawCoverageMap();
  const context = createContext({
    dir: options.outputDir,
    watermarks: {
      statements: [50, 80],
      functions: [50, 80],
      branches: [50, 80],
      lines: [50, 80]
    },
    coverageMap
  });
  const reporter = createReporter("html", {
    skipEmpty: false,
    subdir: ""
  });
  reporter.execute(context);
  return `${options.outputDir}/index.html`;
}

// src/code-coverage/fixtures.ts
import { test as base, expect } from "@playwright/test";
var COVERAGE_EXTRACT_TIMEOUT_MS = 3e4;
async function extractCoverageFromPage(page, timeoutMs = COVERAGE_EXTRACT_TIMEOUT_MS, onError) {
  return Promise.race([
    page.evaluate(() => globalThis.__coverage__ ?? null),
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
  ]).catch((error) => {
    onError?.(error);
    return null;
  });
}
async function attachCoverageToTestInfo(testInfo, coverage) {
  const fragment = {
    istanbul: coverage
  };
  await testInfo.attach("testdino-coverage", {
    body: JSON.stringify(fragment),
    contentType: "application/json"
  });
}
var coverageFixtures = {
  _testdinoCoverage: [
    async ({ page }, use, testInfo) => {
      await use();
      const istanbulCoverage2 = await extractCoverageFromPage(page, COVERAGE_EXTRACT_TIMEOUT_MS, (error) => {
        if (isDebugEnabled()) {
          console.debug(
            `[testdino] Coverage extraction failed for "${testInfo.title}": ${error instanceof Error ? error.message : String(error)}`
          );
        }
      });
      if (istanbulCoverage2) {
        try {
          await attachCoverageToTestInfo(testInfo, istanbulCoverage2);
        } catch {
        }
      }
    },
    { auto: true }
  ]
};
var test = base.extend(
  coverageFixtures
);

// src/utils/ui.ts
import chalk from "chalk";
function supportsColor() {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(process.stdout.isTTY);
}
var colors = {
  success: (text) => supportsColor() ? chalk.green(text) : text,
  error: (text) => supportsColor() ? chalk.red(text) : text,
  warning: (text) => supportsColor() ? chalk.yellow(text) : text,
  info: (text) => supportsColor() ? chalk.cyan(text) : text,
  bold: (text) => supportsColor() ? chalk.bold(text) : text,
  dim: (text) => supportsColor() ? chalk.dim(text) : text,
  white: (text) => supportsColor() ? chalk.white(text) : text,
  gray: (text) => supportsColor() ? chalk.gray(text) : text,
  blue: (text) => supportsColor() ? chalk.blue(text) : text,
  url: (text) => supportsColor() ? chalk.blue.underline(text) : text
};
var symbols = {
  success: "\u2713",
  // ✓
  error: "\u2716",
  // ✖
  warning: "!",
  info: "i",
  debug: "[debug]",
  bullet: "\u2022",
  // •
  pointer: "\u276F",
  // ❯
  line: "\u2500"
  // ─
};
var ESC = String.fromCharCode(27);
var ANSI_PATTERN = `${ESC}\\[[0-9;]*[a-zA-Z]`;
var ANSI_GLOBAL = new RegExp(ANSI_PATTERN, "g");
var ANSI_SEQUENCE = new RegExp(`^${ANSI_PATTERN}`);
function stripAnsi(str) {
  return str.replace(ANSI_GLOBAL, "");
}
function pad(str, len) {
  const vLen = stripAnsi(str).length;
  return vLen >= len ? str : str + " ".repeat(len - vLen);
}
function padStart(str, len) {
  const vLen = stripAnsi(str).length;
  return vLen >= len ? str : " ".repeat(len - vLen) + str;
}
function visibleWidth(str) {
  let width = 0;
  for (const ch of stripAnsi(str)) {
    const cp = ch.codePointAt(0);
    if (isZeroWidth(cp)) continue;
    width += isWide(cp) ? 2 : 1;
  }
  return width;
}
function isZeroWidth(cp) {
  return cp >= 768 && cp <= 879 || cp >= 8203 && cp <= 8207 || cp === 65279 || cp >= 65024 && cp <= 65039;
}
function isWide(cp) {
  return cp >= 4352 && cp <= 4447 || cp >= 11904 && cp <= 42191 || cp >= 44032 && cp <= 55203 || cp >= 63744 && cp <= 64255 || cp >= 65072 && cp <= 65135 || cp >= 65280 && cp <= 65376 || cp >= 65504 && cp <= 65510 || cp >= 127744 && cp <= 129791 || cp >= 131072 && cp <= 262141;
}
function fit(str, len) {
  if (len <= 0) return "";
  const vLen = visibleWidth(str);
  if (vLen === len) return str;
  if (vLen < len) return str + " ".repeat(len - vLen);
  let out = "";
  let width = 0;
  let hasStyle = false;
  let i = 0;
  while (i < str.length) {
    if (str[i] === ESC) {
      const match = ANSI_SEQUENCE.exec(str.slice(i));
      if (match) {
        out += match[0];
        hasStyle = true;
        i += match[0].length;
        continue;
      }
    }
    const ch = String.fromCodePoint(str.codePointAt(i));
    const cw = visibleWidth(ch);
    if (width + cw > len - 1) {
      out += "\u2026";
      break;
    }
    out += ch;
    width += cw;
    i += ch.length;
  }
  return hasStyle ? `${out}${ESC}[0m` : out;
}
function box(content, options = {}) {
  if (content.length === 0 && !options.title) return "";
  const { padding = 1, borderColor = "white", title } = options;
  const maxContentWidth = Math.max(
    0,
    ...content.map((line) => stripAnsi(line).length),
    title ? stripAnsi(title).length : 0
  );
  const boxWidth = maxContentWidth + padding * 2 + 2;
  const colorFn = borderColor === "green" ? colors.success : borderColor === "red" ? colors.error : borderColor === "yellow" ? colors.warning : borderColor === "cyan" ? colors.info : colors.white;
  const lines = [];
  if (title) {
    const titleText = ` ${title} `;
    const remainingWidth = boxWidth - 2 - titleText.length;
    const leftPad = Math.floor(remainingWidth / 2);
    const rightPad = remainingWidth - leftPad;
    lines.push(
      colorFn("\u250C") + colorFn("\u2500".repeat(leftPad)) + colors.bold(titleText) + colorFn("\u2500".repeat(rightPad)) + colorFn("\u2510")
    );
  } else {
    lines.push(colorFn("\u250C") + colorFn("\u2500".repeat(boxWidth - 2)) + colorFn("\u2510"));
  }
  if (padding > 0) {
    lines.push(colorFn("\u2502") + " ".repeat(boxWidth - 2) + colorFn("\u2502"));
  }
  for (const line of content) {
    const lineLength = stripAnsi(line).length;
    const rightSpace = boxWidth - 2 - padding - lineLength - padding;
    lines.push(
      colorFn("\u2502") + " ".repeat(padding) + line + " ".repeat(Math.max(0, rightSpace + padding)) + colorFn("\u2502")
    );
  }
  if (padding > 0) {
    lines.push(colorFn("\u2502") + " ".repeat(boxWidth - 2) + colorFn("\u2502"));
  }
  lines.push(colorFn("\u2514") + colorFn("\u2500".repeat(boxWidth - 2)) + colorFn("\u2518"));
  return lines.join("\n");
}
function formatDuration(ms) {
  if (ms < 1e3) return `${ms}ms`;
  const seconds = ms / 1e3;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}
function shortenPath(filePath) {
  const markers = ["/src/", "/lib/", "/app/"];
  for (const marker of markers) {
    const idx = filePath.indexOf(marker);
    if (idx !== -1) return filePath.slice(idx + 1);
  }
  const parts = filePath.split("/");
  return parts.length > 2 ? parts.slice(-2).join("/") : filePath;
}
function colorPct(pct) {
  const color = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.error;
  return color(pct === 100 ? "100%" : `${pct.toFixed(1)}%`);
}

// src/utils/update-notifier.ts
import axios3 from "axios";
import { readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
var REGISTRY_URL = "https://registry.npmjs.org/@testdino%2fplaywright";
var CHECK_TIMEOUT_MS = 1500;
var CHANGELOG_URL = "https://changelog.testdino.com/?type=cli";
var PACKAGE_NAME = "@testdino/playwright";
var UNRESOLVED_VERSION = "0.0.0";
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var CACHE_FILE = join(tmpdir(), "testdino-playwright-update-check.json");
function readCachedLatest() {
  try {
    const parsed = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    if (typeof parsed.checkedAt !== "number" || typeof parsed.latest !== "string") return void 0;
    const age = Date.now() - parsed.checkedAt;
    if (age < 0 || age >= CACHE_TTL_MS) return void 0;
    return parsed.latest;
  } catch {
    return void 0;
  }
}
function writeCachedLatest(latest) {
  try {
    const entry = { checkedAt: Date.now(), latest };
    writeFileSync(CACHE_FILE, JSON.stringify(entry), "utf-8");
  } catch {
  }
}
function buildUpdateNoticeLines(currentVersion, latestVersion) {
  const label = (text) => colors.dim(text.padEnd("Current:".length));
  return [
    `A new version of ${colors.info(PACKAGE_NAME)} is available`,
    "",
    `${label("Current:")} ${colors.error(currentVersion)}`,
    `${label("Latest:")} ${colors.success(latestVersion)}`,
    "",
    "Update with:",
    `npm install --save-dev ${PACKAGE_NAME}@latest`,
    "",
    `Release notes: ${colors.url(CHANGELOG_URL)}`
  ];
}
function getModuleDir() {
  const metaUrl = typeof import.meta === "object" ? import.meta?.url : void 0;
  if (metaUrl) return dirname(fileURLToPath(metaUrl));
  return __dirname;
}
function getPackageVersion() {
  const candidates = ["../package.json", "../../package.json"];
  for (const candidate of candidates) {
    try {
      const raw = readFileSync(join(getModuleDir(), candidate), "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.name === "@testdino/playwright" && typeof parsed.version === "string") {
        return parsed.version;
      }
    } catch {
      continue;
    }
  }
  return UNRESOLVED_VERSION;
}
function compareVersions(a, b) {
  const parse = (v) => v.replace(/^v/, "").split("+")[0].split("-")[0].split(".").map((part) => Number.parseInt(part, 10));
  const left = parse(a);
  const right = parse(b);
  if (left.some(Number.isNaN) || right.some(Number.isNaN)) return 0;
  for (let i = 0; i < 3; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}
function isPrerelease(version2) {
  return version2.includes("-");
}
async function fetchLatestVersion() {
  try {
    const response = await axios3.get(REGISTRY_URL, {
      timeout: CHECK_TIMEOUT_MS,
      headers: { Accept: "application/vnd.npm.install-v1+json" }
    });
    const version2 = response.data?.["dist-tags"]?.latest;
    return typeof version2 === "string" ? version2 : void 0;
  } catch {
    return void 0;
  }
}
async function checkForUpdate(currentVersion) {
  if (currentVersion === UNRESOLVED_VERSION) return void 0;
  if (isPrerelease(currentVersion)) return void 0;
  const cached = readCachedLatest();
  const latest = cached ?? await fetchLatestVersion();
  if (!latest || isPrerelease(latest)) return void 0;
  if (!cached) writeCachedLatest(latest);
  return compareVersions(latest, currentVersion) > 0 ? latest : void 0;
}
var SETTLE_GRACE_MS = 150;
async function awaitUpdateResult(pending) {
  let timer;
  const grace = new Promise((resolve) => {
    timer = setTimeout(() => resolve(void 0), SETTLE_GRACE_MS);
    timer.unref?.();
  });
  try {
    return await Promise.race([pending.catch(() => void 0), grace]);
  } finally {
    clearTimeout(timer);
  }
}

// src/reporter/log.ts
var BOX_WIDTH = 72;
var LABEL_WIDTH = 11;
var COVERAGE_COL_WIDTH = 10;
var COVERAGE_NAME_MIN = 20;
var COVERAGE_NAME_MAX = 40;
function printCoverageTable(event, thresholdFailures) {
  const { summary, files } = event;
  const indent = "  ";
  const shortened = files.map((f) => shortenPath(f.path));
  const nameW = Math.min(COVERAGE_NAME_MAX, Math.max(COVERAGE_NAME_MIN, ...shortened.map((n) => n.length)) + 2);
  const hasFailures = thresholdFailures && thresholdFailures.length > 0;
  const statusIcon = hasFailures ? colors.error(symbols.error) : colors.success(symbols.success);
  console.log(`${indent}${statusIcon} ${colors.bold("Coverage")}  ${colors.dim(`${files.length} files`)}`);
  console.log("");
  printCoverageHeader(indent, nameW);
  printCoverageRows(indent, nameW, files, shortened);
  printCoverageSummaryRow(indent, nameW, summary);
}
function printCoverageHeader(indent, nameW) {
  const col = COVERAGE_COL_WIDTH;
  console.log(
    `${indent}${colors.dim(`  ${pad("File", nameW)}${padStart("Stmts", col)}${padStart("Branch", col)}${padStart("Funcs", col)}${padStart("Lines", col)}`)}`
  );
}
function printCoverageRows(indent, nameW, files, shortened) {
  const col = COVERAGE_COL_WIDTH;
  const paired = files.map((f, i) => ({ file: f, name: shortened[i] }));
  paired.sort((a, b) => a.file.statements.pct - b.file.statements.pct);
  for (const { file, name } of paired) {
    const display = name.length > nameW ? name.slice(0, nameW - 1) + "\u2026" : name;
    console.log(
      `${indent}  ${pad(display, nameW)}` + padStart(colorPct(file.statements.pct), col) + padStart(colorPct(file.branches.pct), col) + padStart(colorPct(file.functions.pct), col) + padStart(colorPct(file.lines.pct), col)
    );
  }
}
function printCoverageSummaryRow(indent, nameW, summary) {
  const col = COVERAGE_COL_WIDTH;
  const tableW = nameW + col * 4 + 2;
  console.log(`${indent}  ${colors.dim("\u2500".repeat(tableW))}`);
  console.log(
    `${indent}  ${colors.bold(pad("All files", nameW))}` + padStart(colorPct(summary.statements.pct), col) + padStart(colorPct(summary.branches.pct), col) + padStart(colorPct(summary.functions.pct), col) + padStart(colorPct(summary.lines.pct), col)
  );
}
function createBoxHelpers() {
  const topBorder = `  ${colors.dim(`\u250C${"\u2500".repeat(BOX_WIDTH)}\u2510`)}`;
  const bottomBorder = `  ${colors.dim(`\u2514${"\u2500".repeat(BOX_WIDTH)}\u2518`)}`;
  const divider = `  ${colors.dim(`\u251C${"\u2500".repeat(BOX_WIDTH)}\u2524`)}`;
  const row = (content) => `  ${colors.dim("\u2502")} ${fit(content, BOX_WIDTH - 1)}${colors.dim("\u2502")}`;
  const label = (text) => colors.dim(pad(text, LABEL_WIDTH));
  return { row, label, topBorder, bottomBorder, divider };
}
function printArtifactsRow(row, label, counts, isSharded, artifactsDisabled) {
  if (artifactsDisabled) {
    console.log(row(`${label("Artifacts")}${colors.dim("not configured (artifacts: false)")}`));
    return;
  }
  const uploaded = counts.screenshots + counts.videos + counts.traces + counts.other;
  if (uploaded === 0 && counts.unavailable === 0) return;
  const parts = [];
  if (counts.screenshots > 0) parts.push(`${counts.screenshots} screenshots`);
  if (counts.videos > 0) parts.push(`${counts.videos} videos`);
  if (counts.traces > 0) parts.push(`${counts.traces} traces`);
  if (counts.other > 0) parts.push(`${counts.other} other`);
  const summary = parts.length > 0 ? parts.join(colors.dim(" \xB7 ")) : colors.dim("none uploaded");
  const failed = counts.unavailable > 0 ? `  ${colors.warning(`${counts.unavailable} unavailable`)}` : "";
  const scope = isSharded ? `  ${colors.dim("(this shard)")}` : "";
  console.log(row(`${label("Artifacts")}${summary}${failed}${scope}`));
}
function printResultsSection(row, label, result, data) {
  const statusColor = result.status === "passed" ? colors.success : result.status === "failed" ? colors.error : colors.warning;
  const statusLabel = result.status === "timedout" ? "timed out" : result.status;
  console.log(
    row(`${label("Status")}${statusColor(statusLabel.toUpperCase())}  ${colors.dim(formatDuration(result.duration))}`)
  );
  const counts = [];
  if (data.testCounts.passed > 0) counts.push(colors.success(`${data.testCounts.passed} passed`));
  if (data.testCounts.failed > 0) counts.push(colors.error(`${data.testCounts.failed} failed`));
  if (data.testCounts.flaky > 0) counts.push(colors.warning(`${data.testCounts.flaky} flaky`));
  if (data.testCounts.skipped > 0) counts.push(colors.dim(`${data.testCounts.skipped} skipped`));
  if (data.testCounts.timedOut > 0) counts.push(colors.error(`${data.testCounts.timedOut} timed out`));
  if (data.testCounts.interrupted > 0) counts.push(colors.warning(`${data.testCounts.interrupted} interrupted`));
  const retriedStr = data.testCounts.retried > 0 ? `  ${colors.dim(`(${data.testCounts.retried} retries)`)}` : "";
  console.log(
    row(
      `${label("Results")}${counts.join(colors.dim(" \xB7 "))}  ${colors.dim(`of ${data.totalTests}`)}${retriedStr}`
    )
  );
}
function printRunSummary(result, data) {
  const { row, label, topBorder, bottomBorder, divider } = createBoxHelpers();
  console.log("");
  console.log(topBorder);
  console.log(row(colors.bold("TestDino Run Summary")));
  console.log(divider);
  console.log(row(`${label("Run")}${data.runId}`));
  const git = data.runMetadata?.git;
  if (git?.branch || git?.commit?.hash) {
    const branch = git.branch ? colors.info(git.branch) : "";
    const sha = git.commit?.hash ? ` ${colors.dim("@")} ${colors.dim(git.commit.hash.slice(0, 7))}` : "";
    const msg = git.commit?.message ? `  ${colors.dim(git.commit.message.split("\n")[0].slice(0, 40))}` : "";
    console.log(row(`${label("Git")}${branch}${sha}${msg}`));
  }
  console.log(divider);
  printResultsSection(row, label, result, data);
  console.log(divider);
  const shardStr = data.shardInfo ? `${data.shardInfo.current}/${data.shardInfo.total}` : "\u2014";
  console.log(
    row(
      `${label("Workers")}${pad(String(data.workerCount > 0 ? data.workerCount : "\u2014"), 14)}${colors.dim(pad("Shard", 8))}${shardStr}`
    )
  );
  console.log(
    row(`${label("Projects")}${data.projectNames.size > 0 ? Array.from(data.projectNames).join(", ") : "\u2014"}`)
  );
  printArtifactsRow(row, label, data.artifactCounts, Boolean(data.shardInfo), data.artifactsDisabled);
  if (data.lastCoverageEvent) {
    console.log(divider);
    const cov = data.lastCoverageEvent;
    const hasFailures = data.coverageThresholdFailures.length > 0;
    const icon = hasFailures ? colors.error(symbols.error) : colors.success(symbols.success);
    const stmts = colorPct(cov.summary.statements.pct);
    const fileCount = colors.dim(`${cov.files.length} files`);
    console.log(row(`${label("Coverage")}${icon} ${stmts} statements ${colors.dim("\xB7")} ${fileCount}`));
  }
  console.log(bottomBorder);
  if (data.runUrl) {
    console.log("");
    console.log(`  ${colors.dim("View run")}  ${data.runUrl}`);
  }
  if (data.lastCoverageEvent) {
    console.log("");
    printCoverageTable(data.lastCoverageEvent, data.coverageThresholdFailures);
  }
  console.log("");
}
var RUN_LINK_FALLBACK_WIDTH = 100;
function printRunLinkBox(url) {
  const width = process.stdout.columns ?? RUN_LINK_FALLBACK_WIDTH;
  const rule = colors.info(symbols.line.repeat(Math.max(1, width - 4)));
  console.log("");
  console.log(`  ${rule}`);
  console.log("");
  console.log(`  ${colors.blue(symbols.info)} ${colors.bold("See live results")}`);
  console.log("");
  console.log(`  ${colors.url(url)}`);
  console.log("");
  console.log(`  ${rule}`);
  console.log("");
}
function printUpdateNotice(currentVersion, latestVersion) {
  console.log(box(buildUpdateNoticeLines(currentVersion, latestVersion), { borderColor: "white" }));
  console.log("");
}
function createReporterLog(options) {
  return {
    success: (msg) => console.log(`  ${colors.success(symbols.success)} ${msg}`),
    warn: (msg) => console.warn(`  ${colors.warning(symbols.warning)} ${colors.warning(msg)}`),
    error: (msg) => console.error(`  ${colors.error(symbols.error)} ${colors.error(msg)}`),
    info: (msg) => console.log(`  ${colors.info(symbols.info)} ${msg}`),
    debug: (msg) => {
      if (options.debug) {
        console.log(`  ${colors.dim(symbols.debug)} ${colors.dim(msg)}`);
      }
    },
    runLink: (url) => printRunLinkBox(url),
    printRunSummary,
    printCoverageTable,
    printUpdateNotice
  };
}

// src/reporter/index.ts
var MAX_CONSOLE_CHUNK_SIZE = 1e4;
var MAX_BUFFER_SIZE = 500;
var MAX_BUFFER_BYTES = 1e6;
var FLUSH_INTERVAL_MS = 250;
var COVERAGE_FILE_COUNT_WARNING = 500;
var COVERAGE_COMPRESSION_THRESHOLD_BYTES = 1e6;
var MAX_DELIVERY_FAILURES = 3;
var HEARTBEAT_POLL_INTERVAL_MS = 3e4;
var HEARTBEAT_SILENCE_THRESHOLD_MS = 6e4;
var RUN_LINK_MAX_ATTEMPTS = 3;
var RUN_LINK_RETRY_DELAY_MS = 400;
var RUN_LINK_ATTEMPT_TIMEOUT_MS = 1e3;
var RUN_LINK_TOTAL_BUDGET_MS = 3e3;
var TestdinoReporter = class _TestdinoReporter {
  config;
  buffer = null;
  runId;
  sequenceNumber = 0;
  shardInfo;
  // Manual-split correlation, reaching the reporter via the CLI temp-config like shardInfo (not this.config). splitId = group key; splitInfo = position.
  splitInfo;
  splitId;
  // Orchestration correlation, reaching the reporter via the same CLI temp-config
  // channel as splitId. orchestrationId = group key; injectedRunId = the CLI-minted
  // per-batch runId used INSTEAD of a fresh UUID, so the dispatcher ack and this
  // reporter's run:begin/end carry the same identity (the dispatcher-manifest contract).
  orchestrationId;
  injectedRunId;
  // This machine's id under orchestration; emitted on run:begin so ingestion stamps
  // test_cases.device_id for the per-machine breakdown.
  deviceId;
  runStartTime;
  sigintHandler;
  sigtermHandler;
  isShuttingDown = false;
  shutdownResolve = null;
  shutdownPromise = null;
  deliveryFailureCount = 0;
  quotaExceeded = false;
  pendingQuotaError = null;
  httpClient = null;
  runUrlPromise = null;
  resolvedRunUrl;
  projectId = null;
  kafkaProducer = null;
  deliveryManager = null;
  // Constructed at init when enabled; no network call happens until the first
  // test:end that has file attachments. Upload-token issuance is per-test.
  artifactUploadClient = null;
  artifactsEnabled = true;
  // Default: enabled
  // Deferred initialization - resolves true on success, false on failure
  initPromise = null;
  initFailed = false;
  // Promises for onTestEnd; must be awaited in onEnd to prevent data loss
  pendingTestEndPromises = /* @__PURE__ */ new Set();
  openAttempts = /* @__PURE__ */ new Set();
  openAttemptsFinalized = false;
  // Started in onBegin so the registry round trip overlaps the run; read in onEnd
  updateCheckPromise = null;
  artifactCounts = { screenshots: 0, videos: 0, traces: 0, other: 0, unavailable: 0 };
  // Logger for consistent output
  log;
  coverageEnabled = false;
  coverageMerger = null;
  warnedCoverageDisconnect = false;
  coverageThresholdFailures = [];
  testCounts = { passed: 0, failed: 0, skipped: 0, timedOut: 0, interrupted: 0, flaky: 0, retried: 0 };
  totalTests = 0;
  // Orchestration ack-gate signal. Incremented at the TOP of onTestEnd, ahead of the
  // init guard, so it counts every attempt that actually ran even during a TestDino
  // outage (initFailed) where totalTests never increments. The run-result sentinel is
  // written from THIS, so a genuinely-ran batch stays ack-eligible.
  executedTests = 0;
  lastCoverageEvent = null;
  summaryPrinted = false;
  heartbeatTimer = null;
  projectNames = /* @__PURE__ */ new Set();
  runMetadata = null;
  rootDir = "";
  workerCount = 0;
  constructor(config = {}) {
    const cliConfig = this.loadCliConfig();
    this.config = { ...config, ...cliConfig };
    this.runId = this.injectedRunId ?? randomUUID();
    this.log = createReporterLog({ debug: this.config.debug ?? false });
    this.coverageEnabled = this.config.coverage?.enabled ?? false;
    if (this.coverageEnabled) {
      this.coverageMerger = new CoverageMerger({
        include: this.config.coverage?.include,
        exclude: this.config.coverage?.exclude,
        onError: (msg) => this.log.warn(msg)
      });
    }
    this.artifactsEnabled = this.config.artifacts !== false;
    this.buffer = new EventBuffer({
      maxSize: MAX_BUFFER_SIZE,
      maxBytes: MAX_BUFFER_BYTES,
      flushIntervalMs: FLUSH_INTERVAL_MS,
      logger: this.log,
      onFlush: async (events) => {
        if (this.initPromise) {
          const success = await this.initPromise;
          if (!success) return;
        }
        await this.sendEvents(events);
      }
    });
  }
  loadCliConfig() {
    const cliConfigPath = process.env.TESTDINO_CLI_CONFIG_PATH;
    if (!cliConfigPath) {
      return {};
    }
    try {
      if (!existsSync(cliConfigPath)) {
        return {};
      }
      const configContent = readFileSync2(cliConfigPath, "utf-8");
      const cliConfig = JSON.parse(configContent);
      const mappedConfig = {};
      if (cliConfig.token !== void 0 && typeof cliConfig.token === "string") {
        mappedConfig.token = cliConfig.token;
      }
      if (cliConfig.serverUrl !== void 0 && typeof cliConfig.serverUrl === "string") {
        mappedConfig.serverUrl = cliConfig.serverUrl;
      }
      if (cliConfig.debug !== void 0 && typeof cliConfig.debug === "boolean") {
        mappedConfig.debug = cliConfig.debug;
      }
      if (cliConfig.ciRunId !== void 0 && typeof cliConfig.ciRunId === "string") {
        mappedConfig.ciRunId = cliConfig.ciRunId;
      }
      if (cliConfig.artifacts !== void 0 && typeof cliConfig.artifacts === "boolean") {
        mappedConfig.artifacts = cliConfig.artifacts;
      }
      if (typeof cliConfig.coverage === "object" && cliConfig.coverage !== null) {
        mappedConfig.coverage = cliConfig.coverage;
      }
      const rawSplit = cliConfig.split;
      if (rawSplit !== null && typeof rawSplit === "object") {
        const { current, total } = rawSplit;
        if (typeof current === "number" && typeof total === "number") {
          this.splitInfo = { current, total };
        }
      }
      if (typeof cliConfig.splitId === "string" && cliConfig.splitId.length > 0) {
        this.splitId = cliConfig.splitId;
      }
      if (typeof cliConfig.orchestrationId === "string" && cliConfig.orchestrationId.length > 0) {
        this.orchestrationId = cliConfig.orchestrationId;
      }
      if (typeof cliConfig.runId === "string" && cliConfig.runId.length > 0) {
        this.injectedRunId = cliConfig.runId;
      }
      if (typeof cliConfig.deviceId === "string" && cliConfig.deviceId.length > 0) {
        this.deviceId = cliConfig.deviceId;
      }
      if (this.orchestrationId) {
        this.splitId = void 0;
        this.splitInfo = void 0;
      }
      return mappedConfig;
    } catch (error) {
      if (isDebugEnabled()) {
        console.warn(
          "\u26A0\uFE0F  TestDino: Failed to load CLI config:",
          error instanceof Error ? error.message : String(error)
        );
      }
      return {};
    }
  }
  // Wire fields for manual-split mode: splitId top-level, split nested (mirrors
  // shard). Both present or neither, so events never carry a half-set pair.
  splitFields() {
    return this.splitId && this.splitInfo ? { splitId: this.splitId, split: this.splitInfo } : void 0;
  }
  // Wire fields for orchestration mode: orchestrationId (group key, top-level — an
  // orchestrated run has no declared total) plus this machine's deviceId, which
  // ingestion reads off run:begin to stamp per-test attribution. splitId is dropped
  // in loadCliConfig when orchestrationId is set, so the two never co-emit.
  orchFields() {
    if (!this.orchestrationId) return void 0;
    return {
      orchestrationId: this.orchestrationId,
      ...this.deviceId ? { deviceId: this.deviceId } : {}
    };
  }
  async onBegin(config, suite) {
    if (config && this.isDuplicateInstance(config.reporter)) {
      if (this.config.debug) {
        this.log.debug("Reporter already configured in playwright.config, skipping duplicate instance");
      }
      return;
    }
    this.rootDir = config?.rootDir ?? "";
    const token = this.getToken();
    if (!token) {
      this.printConfigurationError("Token is required but not provided", [
        "Set environment variable: export TESTDINO_TOKEN=your-token",
        'Add to playwright.config.ts: token: "your-token"',
        "Use CLI wrapper: npx tdpw test --token your-token"
      ]);
      return;
    }
    if (config?.shard) {
      this.shardInfo = {
        current: config.shard.current,
        total: config.shard.total
      };
    }
    this.runStartTime = Date.now();
    if (!process.env.TESTDINO_CLI_CONFIG_PATH) {
      this.updateCheckPromise = checkForUpdate(getPackageVersion());
    }
    this.initPromise = this.performAsyncInit(config, suite, token);
  }
  async performAsyncInit(config, suite, token) {
    const serverUrl = this.getBaseServerUrl();
    try {
      this.registerSignalHandlers();
      this.httpClient = new HttpClient({ token, serverUrl });
      const auth = await this.httpClient.authenticate();
      this.projectId = auth.projectId;
      this.log.success("Authenticated successfully");
      if (this.artifactsEnabled) {
        this.artifactUploadClient = new ArtifactUploadClient({
          token,
          serverUrl: this.getBaseServerUrl(),
          runId: this.runId,
          onDebug: (message) => this.log.debug(message)
        });
        this.log.debug("Artifact upload client ready (upload tokens minted per-test at test:end)");
      } else {
        this.log.info("Artifact upload disabled (artifacts: false) \u2014 screenshots, videos, and traces stay local");
      }
      const metadata = await this.collectMetadata(config, suite);
      this.runMetadata = metadata;
      this.workerCount = config.workers;
      const beginEvent = {
        type: "run:begin",
        runId: this.runId,
        projectId: this.projectId,
        metadata,
        ciRunId: this.config.ciRunId,
        shard: this.shardInfo,
        ...this.splitFields(),
        ...this.orchFields(),
        coverageEnabled: this.coverageEnabled,
        ...this.config.tags && this.config.tags.length > 0 && { tags: this.config.tags },
        timestamp: Date.now(),
        sequence: 0
      };
      this.log.debug(`Run ${this.runId.slice(0, 8)} \u2014 ${metadata.skeleton?.totalTests ?? 0} tests`);
      let kafkaConnected = false;
      if (auth.kafka) {
        try {
          if (!auth.kafka.channel) {
            throw new Error("Server did not assign a Kafka channel (contract violation)");
          }
          this.kafkaProducer = new KafkaEventProducer({
            brokers: auth.kafka.brokers,
            channel: auth.kafka.channel,
            clientId: `testdino-reporter-${this.runId.slice(0, 8)}`,
            logger: this.log,
            ...auth.kafka.sasl && { sasl: auth.kafka.sasl },
            ...auth.kafka.ssl !== void 0 && { ssl: auth.kafka.ssl }
          });
          await this.kafkaProducer.connect();
          kafkaConnected = true;
        } catch (kafkaError) {
          this.log.warn(
            `Kafka connection failed: ${kafkaError instanceof Error ? kafkaError.message : String(kafkaError)}. Falling back to HTTP delivery.`
          );
          await this.kafkaProducer?.close();
          this.kafkaProducer = null;
        }
      }
      if (kafkaConnected && this.kafkaProducer) {
        if (!auth.httpFallback) {
          this.log.warn("Server omitted httpFallback URL \u2014 kafka-only mode, no recovery on kafka failure");
        }
        this.deliveryManager = new EventDeliveryManager({
          kafkaProducer: this.kafkaProducer,
          httpClient: this.httpClient,
          ...auth.httpFallback && { httpFallbackUrl: auth.httpFallback },
          logger: this.log
        });
      } else if (auth.httpFallback) {
        this.deliveryManager = new EventDeliveryManager({
          httpClient: this.httpClient,
          httpFallbackUrl: auth.httpFallback,
          logger: this.log
        });
      }
      if (this.deliveryManager) {
        this.log.debug(
          kafkaConnected ? "Delivery channel: kafka (primary) + http (fallback)" : "Delivery channel: http only"
        );
        await this.deliveryManager.send(beginEvent);
        this.log.success(kafkaConnected ? "run:begin delivered" : "run:begin delivered (HTTP fallback)");
        this.resolvedRunUrl = await this.resolveRunUrl();
        this.runUrlPromise = Promise.resolve(this.resolvedRunUrl);
        const startLink = this.sliceScopedUrl(this.resolvedRunUrl);
        if (startLink && !this.orchestrationId) this.log.runLink(startLink);
        this.startHeartbeatMonitor();
      }
      return true;
    } catch (error) {
      this.initFailed = true;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (isQuotaError(error)) {
        this.quotaExceeded = true;
        this.pendingQuotaError = error;
      } else if (error instanceof InvalidTokenTypeError) {
        this.printConfigurationError("Invalid token type", [
          error.message,
          "Generate a pipeline API key (td_api_...) from your TestDino project settings",
          `Server URL: ${serverUrl}`
        ]);
      } else if (error instanceof ForbiddenAuthError) {
        this.printConfigurationError("Authentication forbidden", [
          error.message,
          "Verify your project has access to this server",
          `Server URL: ${serverUrl}`
        ]);
      } else if (error instanceof ServerEndpointError) {
        this.printConfigurationError("Wrong server URL", [
          error.message,
          "Check serverUrl in your config (CLI > testdino.config > playwright.config > env)"
        ]);
      } else if (error instanceof UnauthorizedError) {
        this.printConfigurationError("Authentication failed - Invalid or expired token", [
          "Verify your token is correct",
          "Check if the token has expired",
          "Generate a new token from TestDino dashboard",
          `Server URL: ${serverUrl}`
        ]);
      } else {
        this.printConfigurationError(`Failed to initialize TestDino reporter: ${errorMessage}`, [
          "Check if TestDino server is running and accessible",
          `Verify server URL is correct: ${serverUrl}`,
          "Check network connectivity",
          "Review server logs for details"
        ]);
      }
      this.log.error(`Failed to initialize reporter: ${errorMessage}`);
      return false;
    }
  }
  async onTestBegin(test2, result) {
    if (!this.initPromise || this.initFailed) return;
    const key = this.attemptKey(test2, result);
    this.openAttempts.add(key);
    const event = {
      type: "test:begin",
      runId: this.runId,
      ...this.getEventMetadata(),
      // Test identification
      testId: test2.id,
      title: test2.title,
      titlePath: test2.titlePath(),
      // Location information (normalized to repo-relative)
      location: {
        file: this.normalizeFilePath(test2.location.file),
        line: test2.location.line,
        column: test2.location.column
      },
      // Test configuration
      tags: test2.tags,
      expectedStatus: test2.expectedStatus,
      timeout: test2.timeout,
      retries: test2.retries,
      annotations: this.extractAnnotations(test2.annotations),
      // Execution context
      retry: result.retry,
      workerIndex: result.workerIndex,
      parallelIndex: result.parallelIndex,
      repeatEachIndex: test2.repeatEachIndex,
      // Hierarchy information
      parentSuite: this.extractParentSuite(test2.parent),
      // Timing
      startTime: result.startTime.getTime()
    };
    try {
      await this.buffer.add(event);
    } catch {
      this.openAttempts.delete(key);
    }
  }
  attemptKey(test2, result) {
    return `${test2.id}:${result.retry}`;
  }
  finalizeOpenAttemptsAsInterrupted() {
    if (this.openAttemptsFinalized) return;
    this.openAttemptsFinalized = true;
    const n = this.openAttempts.size;
    if (n === 0) return;
    this.testCounts.interrupted += n;
    this.totalTests += n;
    this.executedTests += n;
    this.openAttempts.clear();
  }
  async onStepBegin(test2, result, step) {
    if (!this.initPromise || this.initFailed) return;
    const event = {
      type: "step:begin",
      runId: this.runId,
      ...this.getEventMetadata(),
      testId: test2.id,
      stepId: `${test2.id}-${step.titlePath().join("-")}`,
      title: step.title,
      titlePath: step.titlePath(),
      category: step.category,
      // Location Information (normalized to repo-relative)
      location: step.location ? {
        file: this.normalizeFilePath(step.location.file),
        line: step.location.line,
        column: step.location.column
      } : void 0,
      parentStep: step.parent ? this.extractParentStep(step.parent) : void 0,
      // Timing
      startTime: step.startTime.getTime(),
      retry: result.retry,
      workerIndex: result.workerIndex,
      parallelIndex: result.parallelIndex,
      // Annotations
      annotations: this.extractAnnotations(step.annotations)
    };
    await this.buffer.add(event);
  }
  async onStepEnd(test2, result, step) {
    if (!this.initPromise || this.initFailed) return;
    const status = step.error ? "failed" : "passed";
    const event = {
      type: "step:end",
      runId: this.runId,
      ...this.getEventMetadata(),
      testId: test2.id,
      stepId: `${test2.id}-${step.titlePath().join("-")}`,
      title: step.title,
      titlePath: step.titlePath(),
      // Timing
      duration: step.duration,
      error: this.extractError(step.error),
      // Status Information
      status,
      // Child Steps Summary
      childSteps: this.extractChildSteps(step),
      attachments: this.extractAttachments(step),
      // Annotations
      annotations: this.extractAnnotations(step.annotations),
      retry: result.retry,
      workerIndex: result.workerIndex,
      parallelIndex: result.parallelIndex
    };
    await this.buffer.add(event);
  }
  onTestEnd(test2, result) {
    this.executedTests++;
    if (!this.initPromise || this.initFailed) return;
    this.openAttempts.delete(this.attemptKey(test2, result));
    if (!this.coverageEnabled && !this.warnedCoverageDisconnect) {
      const hasCoverageAttachment = result.attachments.some((a) => a.name === "testdino-coverage");
      if (hasCoverageAttachment) {
        this.log.warn(
          "Coverage data detected but coverage.enabled is false \u2014 set coverage: { enabled: true } to collect coverage"
        );
        this.warnedCoverageDisconnect = true;
      }
    }
    if (this.coverageEnabled && this.coverageMerger) {
      this.extractCoverageFromResult(result, this.coverageMerger);
    }
    const projectName = this.getProjectName(test2);
    if (projectName) {
      this.projectNames.add(projectName);
    }
    if (!this.openAttemptsFinalized) {
      if (result.retry > 0) {
        this.testCounts.retried++;
      }
      const isFinalAttempt = result.status === "passed" || result.status === "interrupted" || result.retry === test2.retries;
      if (isFinalAttempt) {
        this.totalTests++;
        const outcome = test2.outcome();
        if (outcome === "flaky") {
          this.testCounts.flaky++;
        } else if (result.status === "passed") {
          this.testCounts.passed++;
        } else if (result.status === "failed") {
          this.testCounts.failed++;
        } else if (result.status === "skipped") {
          this.testCounts.skipped++;
        } else if (result.status === "timedOut") {
          this.testCounts.timedOut++;
        } else if (result.status === "interrupted") {
          this.testCounts.interrupted++;
        }
      }
    }
    const workPromise = this.processTestEnd(test2, result);
    this.pendingTestEndPromises.add(workPromise);
    workPromise.finally(() => {
      this.pendingTestEndPromises.delete(workPromise);
    });
  }
  waitForShutdown() {
    if (this.isShuttingDown) return Promise.resolve();
    if (!this.shutdownPromise) {
      this.shutdownPromise = new Promise((resolve) => {
        this.shutdownResolve = resolve;
      });
    }
    return this.shutdownPromise;
  }
  async processTestEnd(test2, result) {
    try {
      let attachmentsWithUrls;
      if (this.isShuttingDown) {
        attachmentsWithUrls = this.attachmentsAsUnavailable(result.attachments);
      } else {
        attachmentsWithUrls = await Promise.race([
          this.uploadAttachments(result.attachments, test2.id),
          this.waitForShutdown().then(() => this.attachmentsAsUnavailable(result.attachments))
        ]);
        if (this.isShuttingDown) {
          attachmentsWithUrls = this.attachmentsAsUnavailable(result.attachments);
        } else {
          this.tallyArtifacts(attachmentsWithUrls);
        }
      }
      const event = {
        type: "test:end",
        runId: this.runId,
        ...this.getEventMetadata(),
        testId: test2.id,
        // Status Information
        status: result.status,
        outcome: test2.outcome(),
        // Timing
        duration: result.duration,
        // Execution Context
        retry: result.retry,
        workerIndex: result.workerIndex,
        parallelIndex: result.parallelIndex,
        annotations: this.extractAnnotations(result.annotations),
        errors: result.errors.map((e) => this.extractError(e)).filter((e) => e !== void 0),
        steps: this.extractTestStepsSummary(result),
        // Attachments Metadata (with Azure URLs when uploaded)
        attachments: attachmentsWithUrls,
        stdout: result.stdout.length > 0 ? this.extractConsoleOutput(result.stdout) : void 0,
        stderr: result.stderr.length > 0 ? this.extractConsoleOutput(result.stderr) : void 0
      };
      this.buffer.enqueue(event);
    } catch (error) {
      this.log.error(`Failed to process test:end event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async onEnd(result) {
    const resultPath = process.env.TESTDINO_RUN_RESULT_PATH;
    if (resultPath) {
      try {
        writeFileSync2(resultPath, JSON.stringify({ totalTests: this.executedTests }));
      } catch {
      }
    }
    if (!this.initPromise) {
      await this.printUpdateNoticeIfAvailable();
      return;
    }
    const success = await this.initPromise;
    if (this.quotaExceeded) {
      this.stopHeartbeatMonitor();
      if (this.pendingTestEndPromises.size > 0) {
        await Promise.allSettled(Array.from(this.pendingTestEndPromises));
      }
      if (this.pendingQuotaError) {
        this.printQuotaError(this.pendingQuotaError);
      }
      this.log.success("Tests completed (quota limit reached; not streamed to TestDino)");
      this.buffer?.destroy();
      await this.kafkaProducer?.close();
      await this.printUpdateNoticeIfAvailable();
      this.removeSignalHandlers();
      return { status: "failed" };
    }
    if (!success) {
      if (this.pendingTestEndPromises.size > 0) {
        await Promise.allSettled(Array.from(this.pendingTestEndPromises));
      }
      this.buffer?.destroy();
      this.pendingTestEndPromises.clear();
      await this.kafkaProducer?.close();
      await this.printUpdateNoticeIfAvailable();
      this.removeSignalHandlers();
      return;
    }
    this.stopHeartbeatMonitor();
    if (this.pendingTestEndPromises.size > 0) {
      this.log.debug(`Waiting for ${this.pendingTestEndPromises.size} pending test:end events...`);
      await Promise.allSettled(Array.from(this.pendingTestEndPromises));
    }
    if (this.coverageEnabled && this.coverageMerger?.hasCoverage) {
      try {
        const coverageEvent = this.buildCoverageEvent(this.coverageMerger);
        this.lastCoverageEvent = coverageEvent;
        this.coverageThresholdFailures = this.checkCoverageThresholds(coverageEvent.summary);
        const wireEvent = this.maybeCompressCoverageEvent(coverageEvent);
        await this.buffer.add(wireEvent);
      } catch (error) {
        this.log.warn(`Failed to build coverage event: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (this.coverageMerger?.hasCoverage) {
        try {
          const outputDir = "./coverage";
          const reportPath = await generateIstanbulHtmlReport(this.coverageMerger, {
            outputDir
          });
          this.log.info(`Coverage Report: ${reportPath}`);
        } catch (error) {
          this.log.warn(
            `Failed to generate local HTML report: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } else if (this.coverageEnabled && !this.coverageMerger?.hasCoverage) {
      this.log.warn(
        "Coverage enabled but no data was collected. Ensure your app is instrumented with Istanbul (babel-plugin-istanbul) and tests use { test } from @testdino/playwright"
      );
    }
    const event = {
      type: "run:end",
      runId: this.runId,
      ...this.getEventMetadata(),
      // Run Status
      status: result.status,
      // Timing
      duration: result.duration,
      startTime: result.startTime.getTime(),
      shard: this.shardInfo,
      ...this.splitFields(),
      ...this.orchFields(),
      // Coverage delivery signal — lets server distinguish "not instrumented" from "delivery failed"
      coverageExpected: this.coverageEnabled
    };
    this.buffer?.destroy();
    try {
      await this.buffer?.flush();
    } catch (error) {
      this.log.warn(`Failed to flush buffered events, retrying: ${error}`);
      try {
        await this.buffer?.flush();
      } catch (retryError) {
        this.log.error(`Retry flush also failed, some events may be lost: ${retryError}`);
      }
    }
    if (this.deliveryManager && !this.isShuttingDown) {
      try {
        await this.deliveryManager.send(event);
        this.log.success("run:end delivered");
      } catch (error) {
        this.log.error(`Failed to deliver run:end event: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!this.summaryPrinted) {
      this.summaryPrinted = true;
      const summaryData = {
        runId: this.runId,
        runMetadata: this.runMetadata,
        testCounts: this.testCounts,
        artifactCounts: this.artifactCounts,
        totalTests: this.totalTests,
        workerCount: this.workerCount,
        projectNames: this.projectNames,
        shardInfo: this.shardInfo,
        lastCoverageEvent: this.lastCoverageEvent,
        coverageThresholdFailures: this.coverageThresholdFailures,
        artifactsDisabled: !this.artifactsEnabled,
        // Never re-resolves: a second loop would add its timeout budget to shutdown.
        runUrl: this.sliceScopedUrl(this.resolvedRunUrl ?? await this.runUrlPromise ?? void 0)
      };
      this.log.printRunSummary(result, summaryData);
    }
    const coverageFailed = this.coverageThresholdFailures.length > 0;
    const discardedEvents = this.deliveryManager?.discardCount ?? 0;
    const deliveryFailed = discardedEvents > 0 && !this.initFailed;
    if (coverageFailed) {
      this.log.error("Coverage thresholds not met:");
      for (const msg of this.coverageThresholdFailures) {
        this.log.error(`  ${msg}`);
      }
    }
    if (deliveryFailed) {
      this.printDeliveryDiscardBanner(discardedEvents);
    }
    if (!this.isShuttingDown) {
      await this.kafkaProducer?.close();
      await this.printUpdateNoticeIfAvailable();
      this.removeSignalHandlers();
    }
    if (coverageFailed || deliveryFailed) return { status: "failed" };
  }
  printDeliveryDiscardBanner(count) {
    const border = "\u2550".repeat(70);
    console.error("");
    console.error(border);
    console.error("  \u26A0\uFE0F  TestDino Reporter dropped events \u2014 run marked FAILED");
    console.error(border);
    console.error(`  ${count} event${count === 1 ? "" : "s"} were not delivered to TestDino.`);
    console.error("");
    console.error("  The dashboard for this run will show incomplete data.");
    console.error("  CI exit code is non-zero so this cannot be misread as a passing build.");
    console.error(border);
    console.error("");
  }
  async onError(error) {
    if (!this.initPromise || this.initFailed) return;
    const event = {
      type: "run:error",
      runId: this.runId,
      ...this.getEventMetadata(),
      // Error Information (with cause support)
      error: this.extractGlobalError(error)
    };
    await this.buffer.add(event);
  }
  async onStdOut(chunk, test2, result) {
    if (!this.initPromise || this.initFailed) return;
    const { text, truncated } = this.truncateChunk(chunk);
    const event = {
      type: "console:out",
      runId: this.runId,
      ...this.getEventMetadata(),
      text,
      // Test Association (optional)
      testId: test2?.id,
      retry: result?.retry,
      // Truncation Indicator
      truncated
    };
    await this.buffer.add(event);
  }
  async onStdErr(chunk, test2, result) {
    if (!this.initPromise || this.initFailed) return;
    const { text, truncated } = this.truncateChunk(chunk);
    const event = {
      type: "console:err",
      runId: this.runId,
      ...this.getEventMetadata(),
      // Console Error Output
      text,
      // Test Association (optional)
      testId: test2?.id,
      retry: result?.retry,
      // Truncation Indicator
      truncated
    };
    await this.buffer.add(event);
  }
  printsToStdio() {
    return false;
  }
  async sendEvents(events) {
    if (events.length === 0) return;
    if (this.deliveryManager) {
      try {
        await this.deliveryManager.sendBatch(events);
        this.deliveryFailureCount = 0;
      } catch (error) {
        if (error instanceof HttpDeliveryError && isPermanentHttpStatus(error.status)) {
          this.log.error(`Permanent delivery error (HTTP ${error.status}) \u2014 discarding ${events.length} events`);
          this.deliveryManager.recordDiscard(events.length);
          return;
        }
        if (isQuotaError(error)) {
          this.log.error(`Permanent delivery error (402 quota) \u2014 discarding ${events.length} events`);
          this.quotaExceeded = true;
          this.pendingQuotaError = error;
          this.deliveryManager.recordDiscard(events.length);
          return;
        }
        if (error instanceof PartialBatchError) {
          this.deliveryFailureCount = 0;
          throw error;
        }
        this.deliveryFailureCount++;
        this.log.error(`Failed to deliver events: ${error instanceof Error ? error.message : String(error)}`);
        if (this.deliveryFailureCount <= MAX_DELIVERY_FAILURES) {
          throw error;
        }
        this.log.warn(
          `Delivery failed ${MAX_DELIVERY_FAILURES} consecutive times \u2014 discarding events to prevent memory growth`
        );
        this.deliveryManager.recordDiscard(events.length);
        this.deliveryFailureCount = 0;
      }
    } else {
      this.log.debug(`No delivery manager \u2014 ${events.length} events dropped`);
    }
  }
  getToken() {
    return this.config.token || process.env.TESTDINO_TOKEN;
  }
  getBaseServerUrl() {
    return this.config.serverUrl || process.env.TESTDINO_SERVER_URL || DEFAULT_SERVER_URL;
  }
  printConfigurationError(message, solutions) {
    const border = "\u2550".repeat(70);
    console.error("");
    console.error(border);
    console.error("  \u274C TestDino Reporter Configuration Error");
    console.error(border);
    console.error(`  ${message}`);
    console.error("");
    console.error("  Solutions:");
    solutions.forEach((solution, index) => {
      console.error(`    ${index + 1}. ${solution}`);
    });
    console.error(border);
    console.error("");
  }
  async collectMetadata(playwrightConfig, playwrightSuite) {
    try {
      const metadataCollector = createMetadataCollector(playwrightConfig, playwrightSuite);
      const result = await metadataCollector.collectAll();
      if (result.failureCount > 0) {
        this.log.warn(`${result.failureCount}/${result.results.length} metadata collectors failed`);
      }
      const skeleton = metadataCollector.buildSkeleton(playwrightSuite);
      return {
        ...result.metadata,
        skeleton
      };
    } catch (error) {
      this.log.warn(`Metadata collection failed: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }
  normalizeFilePath(filePath) {
    return normalizePath(filePath, this.rootDir);
  }
  getEventMetadata() {
    return {
      timestamp: Date.now(),
      sequence: ++this.sequenceNumber
    };
  }
  extractAnnotations(annotations) {
    if (!annotations || annotations.length === 0) {
      return [];
    }
    return annotations.map((a) => ({
      type: a.type,
      description: a.description
    }));
  }
  extractParentSuite(parent) {
    return {
      title: parent.title,
      type: parent.type,
      location: parent.location ? {
        file: this.normalizeFilePath(parent.location.file),
        line: parent.location.line,
        column: parent.location.column
      } : void 0
    };
  }
  extractParentStep(parent) {
    return {
      title: parent.title,
      category: parent.category,
      location: parent.location ? {
        file: this.normalizeFilePath(parent.location.file),
        line: parent.location.line,
        column: parent.location.column
      } : void 0
    };
  }
  extractChildSteps(step) {
    return {
      count: step.steps.length,
      steps: step.steps.map((child) => ({
        title: child.title,
        status: child.error ? "failed" : "passed"
      }))
    };
  }
  extractError(error) {
    if (!error) return void 0;
    return {
      message: error.message || String(error),
      stack: error.stack,
      snippet: error.snippet,
      value: error.value,
      location: error.location ? {
        file: this.normalizeFilePath(error.location.file),
        line: error.location.line,
        column: error.location.column
      } : void 0
    };
  }
  extractGlobalError(error) {
    return {
      message: error.message ?? String(error.value ?? "Unknown error"),
      stack: error.stack,
      snippet: error.snippet,
      value: error.value,
      location: error.location ? {
        file: this.normalizeFilePath(error.location.file),
        line: error.location.line,
        column: error.location.column
      } : void 0,
      // Handle nested error cause (v1.49+)
      cause: error.cause ? {
        message: error.cause.message,
        stack: error.cause.stack,
        snippet: error.cause.snippet,
        value: error.cause.value,
        location: error.cause.location ? {
          file: this.normalizeFilePath(error.cause.location.file),
          line: error.cause.location.line,
          column: error.cause.location.column
        } : void 0
      } : void 0
    };
  }
  printQuotaError(error) {
    const border = "\u2550".repeat(70);
    const errorData = error;
    const details = errorData.details;
    const planName = details?.planName || "Unknown";
    const resetDate = details?.resetDate;
    const formattedResetDate = resetDate ? new Date(resetDate).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) : void 0;
    console.error("");
    console.error(border);
    if (errorData.code === "QUOTA_EXCEEDED") {
      const exceeded = details;
      const orgRemaining = (exceeded.total ?? 0) - (exceeded.used ?? 0);
      const effectiveLimit = (exceeded.projectLimit ?? 0) + (exceeded.projectBorrowed ?? 0);
      console.error("  \u274C TestDino Project Execution Limit Reached");
      console.error(border);
      console.error("");
      console.error("  The test case limit allocated to this project has been exceeded.");
      console.error("");
      console.error("  Project Usage:");
      if (exceeded.projectName) {
        console.error(`    Project:          ${exceeded.projectName}`);
      }
      if (exceeded.projectLimit != null) {
        console.error(
          `    Limit:            ${effectiveLimit} test cases${exceeded.projectBorrowed ? ` (${exceeded.projectLimit} allocated + ${exceeded.projectBorrowed} borrowed)` : ""}`
        );
      }
      if (exceeded.projectUsed != null) {
        console.error(`    Used:             ${exceeded.projectUsed}`);
      }
      console.error(`    This run:         ${exceeded.totalTests || "Unknown"} test cases`);
      console.error("    Status:           Project quota exhausted");
      console.error("");
      console.error("  Organization Usage:");
      console.error(`    Plan:             ${planName} (${exceeded.total || "Unknown"} test cases / month)`);
      console.error(`    Used:             ${exceeded.used || "Unknown"}`);
      console.error(`    Remaining:        ${orgRemaining}`);
      if (orgRemaining > 0) {
        console.error("");
        console.error("  Note:");
        console.error(`  Your organization still has ${orgRemaining} test cases available,`);
        console.error("  but they are not allocated to this project.");
      }
      console.error("");
      console.error("  Solutions:");
      console.error("    1. Allocate more test case quota to this project in");
      console.error("       Settings \u2192 Billing & Usage \u2192 Test Limits");
      console.error("    2. Enable Auto Allocation to automatically distribute");
      console.error("       remaining organization quota");
    } else if (errorData.code === "QUOTA_EXHAUSTED") {
      console.error("  \u274C TestDino Organization Execution Limit Reached");
      console.error(border);
      console.error("");
      console.error("  Your organization has exhausted its monthly test case limit.");
      console.error("");
      console.error("  Organization Usage:");
      console.error(`    Plan:             ${planName} (${details.totalLimit || "Unknown"} test cases / month)`);
      console.error(`    Used:             ${details.used || "Unknown"}`);
      console.error("    Remaining:        0");
      console.error("");
      console.error("  Solutions:");
      console.error("    1. Upgrade your plan to increase monthly test case limit");
    }
    if (formattedResetDate) {
      console.error("");
      console.error("  Monthly Reset:");
      console.error(`    ${formattedResetDate}`);
    }
    console.error("");
    console.error("  Docs:    https://docs.testdino.com/platform/billing-and-usage/test-limits");
    console.error("  Pricing: https://testdino.com/pricing");
    console.error("");
    console.error("  CI exit code is non-zero \u2014 this run may be missing data in TestDino.");
    console.error(border);
    console.error("");
  }
  truncateChunk(chunk) {
    let convertedText;
    if (Buffer.isBuffer(chunk)) {
      convertedText = chunk.toString("utf-8");
    } else {
      convertedText = chunk;
    }
    if (convertedText.length > MAX_CONSOLE_CHUNK_SIZE) {
      return {
        text: convertedText.substring(0, MAX_CONSOLE_CHUNK_SIZE) + "\n[truncated]",
        truncated: true
      };
    }
    return { text: convertedText };
  }
  extractAttachments(step) {
    return step.attachments.map((a) => ({
      name: a.name,
      contentType: a.contentType
    }));
  }
  extractTestStepsSummary(result) {
    return {
      total: result.steps.length,
      passed: result.steps.filter((s) => !s.error).length,
      failed: result.steps.filter((s) => s.error).length
    };
  }
  extractConsoleOutput(output) {
    return output.map((item) => typeof item === "string" ? item : item.toString());
  }
  isDuplicateInstance(reporters) {
    const count = this.countTestdinoReporters(reporters);
    return count > 1;
  }
  countTestdinoReporters(reporters) {
    if (!reporters || !Array.isArray(reporters)) {
      return 0;
    }
    let count = 0;
    for (const reporter of reporters) {
      if (Array.isArray(reporter) && reporter.length > 0) {
        const reporterName = reporter[0];
        if (this.isTestdinoReporter(reporterName)) {
          count++;
        }
      } else if (reporter instanceof _TestdinoReporter) {
        count++;
      }
    }
    return count;
  }
  isTestdinoReporter(value) {
    if (typeof value !== "string") {
      return false;
    }
    return value.includes("@testdino/playwright") || value.includes("TestdinoReporter") || value.endsWith("testdino-playwright");
  }
  startHeartbeatMonitor() {
    if (!this.deliveryManager) return;
    this.deliveryManager.lastDeliveryAt = Date.now();
    this.heartbeatTimer = setInterval(() => {
      if (!this.deliveryManager) return;
      const silenceMs = Date.now() - this.deliveryManager.lastDeliveryAt;
      if (silenceMs >= HEARTBEAT_SILENCE_THRESHOLD_MS) {
        const event = {
          type: "run:heartbeat",
          runId: this.runId,
          timestamp: Date.now()
        };
        this.log.debug(`Sending heartbeat (${Math.round(silenceMs / 1e3)}s silence)`);
        void this.deliveryManager.send(event).catch(() => {
        });
      }
    }, HEARTBEAT_POLL_INTERVAL_MS);
    this.heartbeatTimer.unref();
  }
  stopHeartbeatMonitor() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  registerSignalHandlers() {
    this.removeSignalHandlers();
    let lastSignalTime = 0;
    this.sigintHandler = () => {
      const now = Date.now();
      if (this.isShuttingDown) {
        if (now - lastSignalTime > 500) {
          this.log.error("Force exit");
          process.exit(130);
        }
        return;
      }
      lastSignalTime = now;
      this.handleInterruption("SIGINT", 130);
    };
    this.sigtermHandler = () => {
      if (this.isShuttingDown) return;
      this.handleInterruption("SIGTERM", 143);
    };
    process.on("SIGINT", this.sigintHandler);
    process.on("SIGTERM", this.sigtermHandler);
  }
  async resolveRunUrl() {
    if (!this.httpClient || this.initFailed) return void 0;
    const client = this.httpClient;
    const deadline = Date.now() + RUN_LINK_TOTAL_BUDGET_MS;
    for (let attempt = 0; attempt < RUN_LINK_MAX_ATTEMPTS; attempt++) {
      try {
        const url = await withTimeout(
          client.resolveRunLink(this.runId),
          Math.max(0, Math.min(RUN_LINK_ATTEMPT_TIMEOUT_MS, deadline - Date.now())),
          "run link resolve"
        );
        if (url) return url;
      } catch (error) {
        this.log.debug(`Run link unavailable: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof HttpDeliveryError && isPermanentHttpStatus(error.status)) return void 0;
      }
      if (Date.now() + RUN_LINK_RETRY_DELAY_MS >= deadline) break;
      if (attempt < RUN_LINK_MAX_ATTEMPTS - 1) await sleep(RUN_LINK_RETRY_DELAY_MS);
    }
    return void 0;
  }
  // Scope the printed run URL to this process's own slice (split and/or shard),
  // so each CI job links straight to what it ran instead of the whole merged run.
  sliceScopedUrl(url) {
    if (!url) return void 0;
    const params = new URLSearchParams();
    if (this.splitInfo) params.set("split", String(this.splitInfo.current));
    if (this.shardInfo) params.set("shard", String(this.shardInfo.current));
    const query = params.toString();
    return query ? `${url}?${query}` : url;
  }
  async printUpdateNoticeIfAvailable() {
    if (!this.updateCheckPromise) return;
    const pending = this.updateCheckPromise;
    this.updateCheckPromise = null;
    try {
      const latestVersion = await awaitUpdateResult(pending);
      if (latestVersion) {
        this.log.printUpdateNotice(getPackageVersion(), latestVersion);
      }
    } catch {
    }
  }
  removeSignalHandlers() {
    if (this.sigintHandler) {
      process.removeListener("SIGINT", this.sigintHandler);
    }
    if (this.sigtermHandler) {
      process.removeListener("SIGTERM", this.sigtermHandler);
    }
  }
  handleInterruption(signal, exitCode) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.shutdownResolve?.();
    this.shutdownResolve = null;
    this.buffer?.destroy();
    this.stopHeartbeatMonitor();
    this.log.warn(`Received ${signal}, sending interruption event...`);
    if (!this.initPromise) {
      process.exit(exitCode);
    }
    const waitForPending = async () => {
      const deadline = Date.now() + 2500;
      while (this.pendingTestEndPromises.size > 0 && Date.now() < deadline) {
        try {
          await Promise.race([
            Promise.allSettled(Array.from(this.pendingTestEndPromises)),
            this.timeoutPromise(Math.max(50, Math.min(500, deadline - Date.now())), "Pending events timeout")
          ]);
        } catch {
        }
      }
    };
    const event = {
      type: "run:end",
      runId: this.runId,
      ...this.getEventMetadata(),
      status: "interrupted",
      duration: this.runStartTime ? Date.now() - this.runStartTime : 0,
      startTime: this.runStartTime ?? Date.now(),
      shard: this.shardInfo,
      ...this.splitFields(),
      ...this.orchFields()
    };
    const keepAlive = setInterval(() => {
    }, 100);
    const forceExitTimer = setTimeout(() => {
      clearInterval(keepAlive);
      this.log.error("Force exit \u2014 send timeout exceeded");
      process.exit(exitCode);
    }, 1e4);
    const sendAndExit = async () => {
      try {
        if (this.initPromise) {
          await Promise.race([this.initPromise, this.timeoutPromise(2e3, "Init timeout")]).catch(() => {
          });
        }
        await waitForPending();
        if (this.buffer) {
          await Promise.race([this.buffer.flush(), this.timeoutPromise(1e3, "Buffer flush timeout")]).catch(() => {
          });
          if (this.buffer.size() > 0 && this.deliveryManager) {
            const leftover = this.buffer.drain();
            try {
              await Promise.race([
                this.deliveryManager.sendBatch(leftover),
                this.timeoutPromise(1e3, "Emergency drain timeout")
              ]);
            } catch {
            }
          }
        }
        await Promise.race([this.sendInterruptionEvent(event), this.timeoutPromise(2500, "Send timeout")]);
        this.log.success("Interruption event sent");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.log.error(`Failed to send interruption event: ${errorMsg}`);
      } finally {
        this.finalizeOpenAttemptsAsInterrupted();
        if (!this.summaryPrinted) {
          this.summaryPrinted = true;
          const summaryData = {
            runId: this.runId,
            runMetadata: this.runMetadata,
            testCounts: this.testCounts,
            artifactCounts: this.artifactCounts,
            totalTests: this.totalTests,
            workerCount: this.workerCount,
            projectNames: this.projectNames,
            shardInfo: this.shardInfo,
            lastCoverageEvent: this.lastCoverageEvent,
            coverageThresholdFailures: this.coverageThresholdFailures,
            artifactsDisabled: !this.artifactsEnabled,
            runUrl: this.sliceScopedUrl(this.resolvedRunUrl)
          };
          this.log.printRunSummary(
            { status: "interrupted", duration: event.duration, startTime: new Date(event.startTime) },
            summaryData
          );
        }
        clearTimeout(forceExitTimer);
        clearInterval(keepAlive);
        process.exit(exitCode);
      }
    };
    sendAndExit().catch(() => {
      clearTimeout(forceExitTimer);
      clearInterval(keepAlive);
      process.exit(exitCode);
    });
  }
  async sendInterruptionEvent(event) {
    try {
      if (this.deliveryManager) {
        await this.deliveryManager.send(event);
      } else if (this.kafkaProducer?.isConnected) {
        await this.kafkaProducer.send(event);
        await this.kafkaProducer.close();
      }
    } catch {
    }
  }
  timeoutPromise(ms, message) {
    return new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      timer.unref?.();
    });
  }
  // Counts are per attempt, not per test: onTestEnd fires once per retry and each
  // attempt uploads its own artifacts, so a retried test contributes twice. The
  // total therefore matches what was actually stored, not the test count above it.
  //
  // Playwright names attachments 'screenshot' / 'video' / 'trace'; contentType is the
  // fallback for custom names (test.info().attach) that carry no recognizable name.
  tallyArtifacts(attachments) {
    for (const a of attachments) {
      if ("unavailable" in a) {
        this.artifactCounts.unavailable++;
        continue;
      }
      const name = a.name.toLowerCase();
      const type = a.contentType.toLowerCase();
      if (name.includes("screenshot") || type.startsWith("image/")) {
        this.artifactCounts.screenshots++;
      } else if (name.includes("video") || type.startsWith("video/")) {
        this.artifactCounts.videos++;
      } else if (name.includes("trace") && type === "application/zip") {
        this.artifactCounts.traces++;
      } else {
        this.artifactCounts.other++;
      }
    }
  }
  attachmentsAsUnavailable(attachments) {
    return attachments.filter((a) => !!a.path).map((a) => ({ name: a.name, contentType: a.contentType, unavailable: true }));
  }
  async uploadAttachments(attachments, testId) {
    const fileCandidates = attachments.filter(
      (a) => !!a.path
    );
    if (fileCandidates.length === 0) return [];
    if (this.isShuttingDown) {
      return fileCandidates.map((a) => ({ name: a.name, contentType: a.contentType, unavailable: true }));
    }
    if (!this.artifactsEnabled || !this.artifactUploadClient) {
      return fileCandidates.map((a) => ({ name: a.name, contentType: a.contentType, unavailable: true }));
    }
    const stated = await this.statAttachments(fileCandidates);
    if (this.isShuttingDown) {
      return fileCandidates.map((a) => ({ name: a.name, contentType: a.contentType, unavailable: true }));
    }
    const { uploadable, preFiltered } = this.filterUploadable(stated);
    if (uploadable.length === 0) return preFiltered;
    const uploaded = await this.putBatch(uploadable, testId, this.artifactUploadClient);
    if (this.isShuttingDown) {
      return fileCandidates.map((a) => ({ name: a.name, contentType: a.contentType, unavailable: true }));
    }
    return [...preFiltered, ...uploaded];
  }
  async statAttachments(files) {
    const results = await Promise.allSettled(files.map((f) => stat(f.path)));
    return files.map((f, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        return { name: f.name, contentType: f.contentType, path: f.path, sizeBytes: r.value.size };
      }
      this.log.warn(
        `Attachment '${f.name}' unavailable: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
      );
      return { name: f.name, contentType: f.contentType, unavailable: true };
    });
  }
  filterUploadable(stated) {
    const uploadable = [];
    const preFiltered = [];
    for (const item of stated) {
      if ("unavailable" in item) {
        preFiltered.push({ name: item.name, contentType: item.contentType, unavailable: true });
        continue;
      }
      if (isAllowedExtension(basename(item.path)) && isWithinSizeLimit(item.sizeBytes)) {
        uploadable.push(item);
      } else {
        const reason = isAllowedExtension(basename(item.path)) ? `${item.sizeBytes} bytes exceeds the size limit` : `extension not in the allowlist`;
        this.log.debug(`Attachment '${basename(item.path)}' skipped: ${reason}`);
        preFiltered.push({ name: item.name, contentType: item.contentType, unavailable: true });
      }
    }
    return { uploadable, preFiltered };
  }
  async putBatch(uploadable, testId, client) {
    const { ready, readFailed } = await this.snapshotAttachments(uploadable);
    if (ready.length === 0) return readFailed;
    const asUnavailable = () => [
      ...readFailed,
      ...ready.map((f) => ({ name: f.name, contentType: f.contentType, unavailable: true }))
    ];
    let tokens;
    try {
      const request = ready.map((f) => ({
        // Send the file's basename (with extension) — the server's allowlist and
        // the blob key's Content-Type (rsct) derive from the extension, which the
        // bare attachment name ("screenshot") lacks. The display name is kept
        // unchanged on the returned wire attachment below. sizeBytes is the
        // ACTUAL snapshot length, not stat — the server accounts on this value
        // and it must match the Content-Length on the PUT.
        name: basename(f.path),
        testId,
        contentType: f.contentType,
        sizeBytes: f.bytes.length
      }));
      tokens = await client.requestUploadTokens(request);
    } catch (error) {
      const detail = error instanceof ArtifactUploadTokenError ? `${error.kind}${error.serverCode ? `/${error.serverCode}` : ""}: ${error.message}` : error instanceof Error ? error.message : String(error);
      this.log.warn(`Upload-token request failed for test ${testId}: ${detail}. Attachments marked unavailable.`);
      return asUnavailable();
    }
    if (tokens.uploads.length !== ready.length) {
      this.log.warn(
        `Upload-token response length mismatch for test ${testId} (expected ${ready.length}, got ${tokens.uploads.length}). Attachments marked unavailable.`
      );
      return asUnavailable();
    }
    const settled = await Promise.allSettled(
      ready.map((f, i) => client.uploadFile(tokens.uploads[i].uploadUrl, f.bytes, f.contentType))
    );
    const uploaded = ready.map((f, i) => {
      const outcome = settled[i];
      if (outcome.status === "fulfilled") {
        return { name: f.name, contentType: f.contentType, blobKey: tokens.uploads[i].blobKey };
      }
      this.log.warn(
        `Upload failed for '${f.name}' (test ${testId}): ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`
      );
      return { name: f.name, contentType: f.contentType, unavailable: true };
    });
    return [...readFailed, ...uploaded];
  }
  async snapshotAttachments(uploadable) {
    const reads = await Promise.allSettled(uploadable.map((f) => readFile3(f.path)));
    const ready = [];
    const readFailed = [];
    uploadable.forEach((f, i) => {
      const r = reads[i];
      if (r.status === "fulfilled") {
        ready.push({ name: f.name, contentType: f.contentType, path: f.path, sizeBytes: f.sizeBytes, bytes: r.value });
      } else {
        this.log.warn(
          `Attachment '${f.name}' unavailable (snapshot failed): ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
        );
        readFailed.push({ name: f.name, contentType: f.contentType, unavailable: true });
      }
    });
    return { ready, readFailed };
  }
  getProjectName(test2) {
    let suite = test2.parent;
    while (suite) {
      const project = suite.project();
      if (project) {
        return project.name || project.use?.defaultBrowserType || "default";
      }
      suite = suite.parent;
    }
    return void 0;
  }
  extractCoverageFromResult(result, merger) {
    const coverageAttachment = result.attachments.find((a) => a.name === "testdino-coverage");
    if (!coverageAttachment?.body) return;
    try {
      const fragment = JSON.parse(coverageAttachment.body.toString());
      merger.addFragment(fragment);
    } catch (error) {
      this.log.debug(
        `Malformed coverage attachment, skipping: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  buildCoverageEvent(merger) {
    const rootDir = this.rootDir || process.cwd();
    const summary = merger.computeSummary();
    const files = merger.computeFileCoverage(rootDir);
    const isSharded = !!this.shardInfo;
    if (files.length > COVERAGE_FILE_COUNT_WARNING) {
      this.log.warn(
        `Coverage includes ${files.length} files \u2014 consider using coverage.include/exclude to reduce scope`
      );
    }
    const event = {
      type: "coverage:data",
      runId: this.runId,
      ...this.getEventMetadata(),
      summary,
      files,
      metadata: {
        instrumentationType: "istanbul",
        fileCount: files.length,
        sharded: isSharded
      }
    };
    if (isSharded) {
      const coverageMapJSON = merger.toJSON();
      event.compactCounts = extractCompactCounts(coverageMapJSON, rootDir);
      event.shard = this.shardInfo;
    }
    const splitFields = this.splitFields();
    if (splitFields) {
      event.splitId = splitFields.splitId;
      event.split = splitFields.split;
    }
    return event;
  }
  maybeCompressCoverageEvent(event) {
    const json = JSON.stringify(event);
    const byteLength = Buffer.byteLength(json, "utf8");
    this.log.debug(
      `Coverage event payload: ${(byteLength / 1024).toFixed(0)}KB (threshold: ${(COVERAGE_COMPRESSION_THRESHOLD_BYTES / 1024).toFixed(0)}KB)`
    );
    if (byteLength <= COVERAGE_COMPRESSION_THRESHOLD_BYTES) {
      return event;
    }
    try {
      const compressed = gzipSync(Buffer.from(json, "utf8"));
      const payload = compressed.toString("base64");
      this.log.info(
        `Coverage payload compressed: ${(byteLength / 1024).toFixed(0)}KB \u2192 ${(payload.length / 1024).toFixed(0)}KB`
      );
      return {
        type: "coverage:data",
        runId: event.runId,
        timestamp: event.timestamp,
        sequence: event.sequence,
        compression: "gzip",
        payload
      };
    } catch (error) {
      this.log.warn(
        `Coverage compression failed, sending uncompressed: ${error instanceof Error ? error.message : String(error)}`
      );
      return event;
    }
  }
  checkCoverageThresholds(summary) {
    const thresholds = this.config.coverage?.thresholds;
    if (!thresholds) return [];
    const failures = [];
    const check = (name, actual, threshold) => {
      if (threshold !== void 0 && actual < threshold) {
        failures.push(`${name}: ${actual.toFixed(2)}% < ${threshold}%`);
      }
    };
    check("Statements", summary.statements.pct, thresholds.statements);
    check("Branches", summary.branches.pct, thresholds.branches);
    check("Functions", summary.functions.pct, thresholds.functions);
    check("Lines", summary.lines.pct, thresholds.lines);
    return failures;
  }
};
export {
  coverageFixtures,
  TestdinoReporter as default,
  expect,
  test
};
//# sourceMappingURL=index.mjs.map