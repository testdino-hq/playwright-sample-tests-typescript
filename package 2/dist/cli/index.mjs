#!/usr/bin/env node

// src/cli/index.ts
import { Command as Command3 } from "commander";

// src/cli/config-loader.ts
import { existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createJiti } from "jiti";

// src/cli/errors.ts
var TestDinoError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "TestDinoError";
    Error.captureStackTrace(this, this.constructor);
  }
};
var TokenMissingError = class extends TestDinoError {
  constructor() {
    const message = `Token is required to run tests with TestDino

Provide token via:
  \u2022 CLI flag:    npx tdpw test --token <your-token>
  \u2022 Environment: export TESTDINO_TOKEN=<your-token>
  \u2022 Config file: Create testdino.config.ts with token

Get your token at: https://testdino.com/settings`;
    super(message);
    this.name = "TokenMissingError";
  }
};
var ConfigSyntaxError = class extends TestDinoError {
  constructor(configPath, originalError) {
    const message = `Failed to load ${configPath}

${originalError.message}

Fix the syntax error and try again.`;
    super(message);
    this.name = "ConfigSyntaxError";
  }
};
var InvalidSplitFlagError = class extends TestDinoError {
  constructor(value) {
    const message = `Invalid --split value: ${value}

--split must be <current>/<total> with positive integers and current <= total.

Examples:
  \u2022 --split 1/5
  \u2022 --split 3/3`;
    super(message);
    this.name = "InvalidSplitFlagError";
  }
};
var InvalidMachineCountError = class extends TestDinoError {
  constructor(value) {
    const seen = value === void 0 ? "" : `: ${value}`;
    const message = `Invalid machine count${seen}

The number of machines is required and must be a positive integer.

Provide it via:
  \u2022 CLI flag:    npx tdpw orchestrate discover --machines <N>
  \u2022 Environment: export TESTDINO_MACHINES=<N>

Example:
  \u2022 --machines 4`;
    super(message);
    this.name = "InvalidMachineCountError";
  }
};
var SplitConfigMismatchError = class extends TestDinoError {
  constructor() {
    const message = `Split mode requires both a position (--split) and a group id (--split-id or TESTDINO_SPLIT_ID)

Provide both:
  \u2022 npx tdpw test --split 1/5 --split-id <group-id>
  \u2022 or set the id from the environment:  TESTDINO_SPLIT_ID=<group-id> npx tdpw test --split 1/5

The group id must be unique per pipeline execution so separate runs do not merge.`;
    super(message);
    this.name = "SplitConfigMismatchError";
  }
};
var OrchestrationSplitConflictError = class extends TestDinoError {
  constructor() {
    super(
      `Orchestration and manual-split modes are mutually exclusive \u2014 a run cannot carry both an orchestration id and a split id. Use one grouping mode per run.`
    );
    this.name = "OrchestrationSplitConflictError";
  }
};
var NoTestsDiscoveredError = class extends TestDinoError {
  constructor(grep, project) {
    const applied = [grep ? `--grep ${grep}` : "", project?.length ? `--project ${project.join(",")}` : ""].filter(Boolean).join(" ");
    const message = `No tests matched discovery${applied ? ` for ${applied}` : ""}

Check your filters and that Playwright can collect tests in this directory.`;
    super(message);
    this.name = "NoTestsDiscoveredError";
  }
};
var DiscoveryFailedError = class extends TestDinoError {
  constructor(detail) {
    const message = `Failed to list tests via Playwright

${detail}

Ensure @playwright/test is installed and your Playwright config compiles:
  \u2022 npm install -D @playwright/test`;
    super(message);
    this.name = "DiscoveryFailedError";
  }
};
var InvalidServerUrlError = class extends TestDinoError {
  constructor(url) {
    const message = `Invalid server URL: ${url}

Server URL must be a valid HTTP or HTTPS URL.

Examples:
  \u2022 https://reporter.testdino.com
  \u2022 https://api-v0.testdino.com
  \u2022 https://global.testdino.com`;
    super(message);
    this.name = "InvalidServerUrlError";
  }
};

// src/cli/config-loader.ts
var CONFIG_FILENAMES = ["testdino.config.ts", "testdino.config.js"];
var ConfigLoader = class {
  cwd;
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }
  async load() {
    const configPath = this.findConfigFile();
    if (!configPath) {
      return { config: {} };
    }
    try {
      const config = await this.loadConfigFile(configPath);
      return { config, configPath };
    } catch (error) {
      throw new ConfigSyntaxError(configPath, error instanceof Error ? error : new Error(String(error)));
    }
  }
  findConfigFile() {
    let currentDir = this.cwd;
    while (true) {
      for (const filename of CONFIG_FILENAMES) {
        const configPath = join(currentDir, filename);
        if (existsSync(configPath)) {
          return configPath;
        }
      }
      const gitDir = join(currentDir, ".git");
      if (existsSync(gitDir) && statSync(gitDir).isDirectory()) {
        break;
      }
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
    return void 0;
  }
  async loadConfigFile(configPath) {
    const jitiLoader = createJiti(dirname(configPath), {
      interopDefault: true,
      fsCache: false,
      extensions: [".ts", ".js"]
    });
    let loaded;
    try {
      const resolved = jitiLoader.esmResolve(configPath, { try: true });
      if (!resolved) {
        throw new Error(`Could not resolve config file: ${configPath}`);
      }
      const resolvedPath = typeof resolved === "string" ? resolved : fileURLToPath(resolved);
      loaded = await jitiLoader.import(resolvedPath);
    } catch (error) {
      throw new Error(`Syntax error: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
    let config;
    if (loaded && typeof loaded === "object" && "__esModule" in loaded) {
      config = loaded.default;
    } else if (loaded && typeof loaded === "object" && "default" in loaded) {
      config = loaded.default;
    } else {
      config = loaded;
    }
    if (config === null || config === void 0) {
      return {};
    }
    if (typeof config === "function") {
      try {
        config = config();
      } catch (error) {
        throw new Error(`Error executing config function: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error
        });
      }
      if (config instanceof Promise) {
        throw new Error("Async config functions are not supported");
      }
      if (config === null || config === void 0) {
        return {};
      }
    }
    if (config && typeof config !== "object") {
      throw new Error("Config must be an object");
    }
    return config ?? {};
  }
};

// src/cli/config-detector.ts
import { existsSync as existsSync2 } from "fs";
import { join as join2, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createJiti as createJiti2 } from "jiti";
var PLAYWRIGHT_CONFIG_FILENAMES = ["playwright.config.ts", "playwright.config.js"];
var TESTDINO_REPORTER_NAMES = ["@testdino/playwright", "testdino-playwright", "TestdinoReporter"];
function isValidThreshold(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}
var ConfigDetector = class {
  cwd;
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }
  async detect() {
    const configPath = this.findPlaywrightConfig();
    if (!configPath) {
      return { hasReporter: false };
    }
    try {
      const config = await this.loadPlaywrightConfig(configPath);
      const result = this.extractTestdinoReporter(config);
      const workersInt = typeof config.workers === "number" && Number.isInteger(config.workers) && config.workers >= 1;
      return {
        ...result,
        configPath,
        ...workersInt ? { workers: config.workers } : {},
        ...typeof config.fullyParallel === "boolean" ? { fullyParallel: config.fullyParallel } : {}
      };
    } catch (error) {
      throw new ConfigSyntaxError(configPath, error instanceof Error ? error : new Error(String(error)));
    }
  }
  findPlaywrightConfig() {
    for (const filename of PLAYWRIGHT_CONFIG_FILENAMES) {
      const configPath = join2(this.cwd, filename);
      if (existsSync2(configPath)) {
        return configPath;
      }
    }
    return void 0;
  }
  async loadPlaywrightConfig(configPath) {
    const jitiLoader = createJiti2(dirname2(configPath), {
      interopDefault: true,
      fsCache: false,
      extensions: [".ts", ".js"]
    });
    let loaded;
    try {
      const resolved = jitiLoader.esmResolve(configPath, { try: true });
      if (!resolved) {
        throw new Error(`Could not resolve Playwright config: ${configPath}`);
      }
      const resolvedPath = typeof resolved === "string" ? resolved : fileURLToPath2(resolved);
      loaded = await jitiLoader.import(resolvedPath);
    } catch (error) {
      throw new Error(`Syntax error: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
    let config;
    if (loaded && typeof loaded === "object" && "__esModule" in loaded) {
      config = loaded.default;
    } else if (loaded && typeof loaded === "object" && "default" in loaded) {
      config = loaded.default;
    } else {
      config = loaded;
    }
    if (typeof config === "function") {
      try {
        config = config();
      } catch (error) {
        throw new Error(`Error executing config function: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error
        });
      }
    }
    if (!config || typeof config !== "object") {
      throw new Error("Playwright config must be an object");
    }
    return config;
  }
  extractTestdinoReporter(config) {
    const { reporter } = config;
    if (!reporter) {
      return { hasReporter: false };
    }
    if (typeof reporter === "string") {
      if (this.isTestdinoReporter(reporter)) {
        return { hasReporter: true, options: {} };
      }
      return { hasReporter: false };
    }
    if (Array.isArray(reporter) && reporter.length > 0) {
      if (typeof reporter[0] === "string") {
        const [name, options] = reporter;
        if (this.isTestdinoReporter(name)) {
          return {
            hasReporter: true,
            options: this.extractOptions(options)
          };
        }
        if (!Array.isArray(reporter[1])) {
          return { hasReporter: false };
        }
      }
      for (const item of reporter) {
        if (typeof item === "string") {
          if (this.isTestdinoReporter(item)) {
            return { hasReporter: true, options: {} };
          }
        } else if (Array.isArray(item) && item.length > 0) {
          const [name, options] = item;
          if (this.isTestdinoReporter(name)) {
            return {
              hasReporter: true,
              options: this.extractOptions(options)
            };
          }
        }
      }
    }
    return { hasReporter: false };
  }
  isTestdinoReporter(name) {
    return TESTDINO_REPORTER_NAMES.some((testdinoName) => name === testdinoName || name.includes(testdinoName));
  }
  extractOptions(options) {
    if (!options || typeof options !== "object") {
      return {};
    }
    const config = {};
    if ("token" in options && typeof options.token === "string") {
      config.token = options.token;
    }
    if ("serverUrl" in options && typeof options.serverUrl === "string") {
      config.serverUrl = options.serverUrl;
    }
    if ("ciRunId" in options && typeof options.ciRunId === "string") {
      config.ciRunId = options.ciRunId;
    }
    if ("debug" in options && typeof options.debug === "boolean") {
      config.debug = options.debug;
    }
    if ("coverage" in options && typeof options.coverage === "object" && options.coverage !== null) {
      config.coverage = this.extractCoverageConfig(options.coverage);
    }
    return config;
  }
  extractCoverageConfig(raw) {
    const config = {
      enabled: typeof raw.enabled === "boolean" ? raw.enabled : false
    };
    if (Array.isArray(raw.include)) {
      config.include = raw.include.filter((p) => typeof p === "string");
    }
    if (Array.isArray(raw.exclude)) {
      config.exclude = raw.exclude.filter((p) => typeof p === "string");
    }
    if (typeof raw.thresholds === "object" && raw.thresholds !== null) {
      const t = raw.thresholds;
      config.thresholds = {};
      if (isValidThreshold(t.statements)) config.thresholds.statements = t.statements;
      if (isValidThreshold(t.branches)) config.thresholds.branches = t.branches;
      if (isValidThreshold(t.functions)) config.thresholds.functions = t.functions;
      if (isValidThreshold(t.lines)) config.thresholds.lines = t.lines;
    }
    return config;
  }
};

// src/cli/config-merger.ts
import { randomUUID } from "crypto";

// src/types/index.ts
var DEFAULT_SERVER_URL = "https://reporter.testdino.com";

// src/cli/config-merger.ts
function parseSplitFlag(raw) {
  const match = /^(\d+)\/(\d+)$/.exec(raw.trim());
  if (!match) {
    throw new InvalidSplitFlagError(raw);
  }
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (current < 1 || total < 1 || current > total) {
    throw new InvalidSplitFlagError(raw);
  }
  return { current, total };
}
var ConfigMerger = class {
  merge(sources) {
    const { env = {}, playwrightConfig = {}, testdinoConfig = {}, cliOptions = {} } = sources;
    const token = this.selectValue(cliOptions.token, testdinoConfig.token, playwrightConfig.token, env.token);
    const serverUrl = this.selectValue(cliOptions.serverUrl, testdinoConfig.serverUrl, playwrightConfig.serverUrl, env.serverUrl) || DEFAULT_SERVER_URL;
    const ciRunId = this.selectValue(cliOptions.ciRunId, testdinoConfig.ciRunId, playwrightConfig.ciRunId, env.ciRunId) || this.generateCiRunId();
    const debug = this.selectValue(cliOptions.debug, testdinoConfig.debug, playwrightConfig.debug, env.debug) ?? false;
    const artifacts = cliOptions.artifacts !== void 0 ? cliOptions.artifacts : this.selectValue(testdinoConfig.artifacts, playwrightConfig.artifacts) ?? true;
    const coverage = this.mergeCoverageConfig(cliOptions.coverage, testdinoConfig.coverage, playwrightConfig.coverage);
    const tags = this.normalizeTags(cliOptions.tags) ?? this.normalizeTags(testdinoConfig.tags) ?? this.normalizeTags(playwrightConfig.tags) ?? this.normalizeTags(env.tags);
    const split = cliOptions.split !== void 0 ? parseSplitFlag(cliOptions.split) : void 0;
    const orchestrationId = cliOptions.orchestrationId;
    const runId = cliOptions.runId;
    const deviceId = cliOptions.deviceId;
    const splitId = orchestrationId ? cliOptions.splitId : this.selectValue(cliOptions.splitId, testdinoConfig.splitId, playwrightConfig.splitId, env.splitId);
    const mergedConfig = {
      token,
      serverUrl,
      ciRunId,
      debug,
      artifacts,
      ...coverage ? { coverage } : {},
      ...tags ? { tags } : {},
      ...split ? { split } : {},
      ...splitId ? { splitId } : {},
      ...orchestrationId ? { orchestrationId } : {},
      ...runId ? { runId } : {},
      ...deviceId ? { deviceId } : {}
    };
    this.validate(mergedConfig);
    return mergedConfig;
  }
  mergeCoverageConfig(cliCoverage, testdinoCoverage, playwrightCoverage) {
    const baseConfig = testdinoCoverage ?? playwrightCoverage;
    if (!baseConfig && cliCoverage === void 0) return void 0;
    if (cliCoverage !== void 0) {
      return { ...baseConfig || { enabled: false }, enabled: cliCoverage };
    }
    return baseConfig;
  }
  // A blank string is treated as absent, not as a value. Otherwise a higher-priority
  // `--server-url ""` masks a valid lower-priority serverUrl and silently routes the
  // run to the built-in default instead of the server the user configured.
  selectValue(...values) {
    return values.find(
      (value) => value !== void 0 && value !== null && !(typeof value === "string" && value.trim() === "")
    );
  }
  normalizeTags(input) {
    if (input === void 0 || input === null) return void 0;
    const raw = typeof input === "string" ? input.split(",") : input;
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const t = item.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
    return out.length > 0 ? out : void 0;
  }
  generateCiRunId() {
    return `run-${randomUUID()}`;
  }
  validate(config) {
    if (!config.token || typeof config.token !== "string" || config.token.trim().length === 0) {
      throw new TokenMissingError();
    }
    if (config.serverUrl) {
      if (typeof config.serverUrl !== "string" || !this.isValidUrl(config.serverUrl)) {
        throw new InvalidServerUrlError(config.serverUrl);
      }
    }
    const hasSplit = config.split !== void 0;
    const hasSplitId = config.splitId !== void 0;
    if (hasSplit !== hasSplitId) {
      throw new SplitConfigMismatchError();
    }
    if (config.orchestrationId !== void 0 && hasSplitId) {
      throw new OrchestrationSplitConflictError();
    }
  }
  isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
  static getEnvConfig() {
    const config = {};
    if (process.env.TESTDINO_TOKEN) {
      config.token = process.env.TESTDINO_TOKEN;
    }
    if (process.env.TESTDINO_SERVER_URL) {
      config.serverUrl = process.env.TESTDINO_SERVER_URL;
    }
    if (process.env.TESTDINO_CI_RUN_ID) {
      config.ciRunId = process.env.TESTDINO_CI_RUN_ID;
    }
    if (process.env.TESTDINO_SPLIT_ID) {
      config.splitId = process.env.TESTDINO_SPLIT_ID;
    }
    if (process.env.TESTDINO_DEBUG) {
      config.debug = process.env.TESTDINO_DEBUG === "true" || process.env.TESTDINO_DEBUG === "1";
    }
    if (process.env.TESTDINO_TAGS) {
      config.tags = process.env.TESTDINO_TAGS.split(",");
    }
    return config;
  }
};

// src/cli/arg-filter.ts
var TESTDINO_FLAGS = ["--token", "-t", "--ci-run-id", "--server-url", "--debug", "--no-artifacts", "--coverage"];
var FLAGS_WITH_VALUES = ["--token", "-t", "--ci-run-id", "--server-url"];
var ArgFilter = class {
  filter(args) {
    const result = [];
    let skipNext = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (skipNext) {
        skipNext = false;
        continue;
      }
      if (this.isTestdinoFlag(arg)) {
        if (this.isFlagWithValue(arg) && !arg.includes("=")) {
          skipNext = true;
        }
        continue;
      }
      result.push(arg);
    }
    return result;
  }
  isTestdinoFlag(arg) {
    const flagName = arg.split("=")[0];
    return TESTDINO_FLAGS.includes(flagName);
  }
  isFlagWithValue(arg) {
    const flagName = arg.split("=")[0];
    return FLAGS_WITH_VALUES.includes(flagName);
  }
  static getTestdinoFlags() {
    return [...TESTDINO_FLAGS];
  }
};

// src/cli/temp-config.ts
import { writeFileSync as writeFileSync2, unlinkSync, existsSync as existsSync3 } from "fs";
import { join as join4 } from "path";
import { tmpdir as tmpdir2 } from "os";
import { randomUUID as randomUUID2 } from "crypto";

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

// src/utils/update-notifier.ts
import axios from "axios";
import { readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname as dirname3, join as join3 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var REGISTRY_URL = "https://registry.npmjs.org/@testdino%2fplaywright";
var CHECK_TIMEOUT_MS = 1500;
var CHANGELOG_URL = "https://changelog.testdino.com/?type=cli";
var PACKAGE_NAME = "@testdino/playwright";
var UNRESOLVED_VERSION = "0.0.0";
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var CACHE_FILE = join3(tmpdir(), "testdino-playwright-update-check.json");
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
  if (metaUrl) return dirname3(fileURLToPath3(metaUrl));
  return __dirname;
}
function getPackageVersion() {
  const candidates = ["../package.json", "../../package.json"];
  for (const candidate of candidates) {
    try {
      const raw = readFileSync(join3(getModuleDir(), candidate), "utf-8");
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
function isPrerelease(version) {
  return version.includes("-");
}
async function fetchLatestVersion() {
  try {
    const response = await axios.get(REGISTRY_URL, {
      timeout: CHECK_TIMEOUT_MS,
      headers: { Accept: "application/vnd.npm.install-v1+json" }
    });
    const version = response.data?.["dist-tags"]?.latest;
    return typeof version === "string" ? version : void 0;
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

// src/cli/logger.ts
var Logger = class {
  debugEnabled;
  constructor(debugEnabled = false) {
    this.debugEnabled = debugEnabled;
  }
  setDebug(enabled) {
    this.debugEnabled = enabled;
  }
  error(message, error) {
    console.error(`  ${colors.error(symbols.error)} ${colors.error(message)}`);
    if (error && this.debugEnabled) {
      console.error(colors.dim(`  Stack trace:
${error.stack || error.message}`));
    }
  }
  warn(message) {
    console.warn(`  ${colors.warning(symbols.warning)} ${colors.warning(message)}`);
  }
  info(message) {
    console.log(`  ${colors.info(symbols.info)} ${message}`);
  }
  success(message) {
    console.log(`  ${colors.success(symbols.success)} ${message}`);
  }
  debug(message) {
    if (this.debugEnabled) {
      console.log(`  ${colors.dim(symbols.debug)} ${colors.dim(message)}`);
    }
  }
  newline() {
    console.log();
  }
  section(title) {
    console.log(`
${colors.bold(title)}`);
  }
  listItem(text) {
    console.log(`  ${colors.dim(symbols.bullet)} ${text}`);
  }
  code(text) {
    console.log(colors.gray(`  ${text}`));
  }
  formatError(error) {
    if (this.debugEnabled && error.stack) {
      return error.stack;
    }
    return error.message;
  }
  banner(version) {
    console.log(
      box([`TestDino Playwright v${version}`, colors.dim("https://testdino.com")], {
        borderColor: "cyan"
      })
    );
    console.log();
  }
  updateNotice(currentVersion, latestVersion) {
    console.log(box(buildUpdateNoticeLines(currentVersion, latestVersion), { borderColor: "white" }));
    console.log();
  }
};

// src/cli/temp-config.ts
var TempConfigManager = class {
  tempFiles = /* @__PURE__ */ new Set();
  cleanupHandlersRegistered = false;
  exitHandler;
  sigintHandler;
  sigtermHandler;
  uncaughtExceptionHandler;
  unhandledRejectionHandler;
  logger;
  constructor(logger2) {
    this.logger = logger2 ?? new Logger();
  }
  create(config) {
    const tempPath = this.generateTempPath();
    try {
      const configJson = JSON.stringify(config, null, 2);
      writeFileSync2(tempPath, configJson, "utf-8");
      this.tempFiles.add(tempPath);
      if (!this.cleanupHandlersRegistered) {
        this.registerCleanupHandlers();
        this.cleanupHandlersRegistered = true;
      }
      return {
        path: tempPath,
        config
      };
    } catch (error) {
      throw new Error(
        `Failed to create temp config file: ${tempPath}
${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }
  cleanup(tempPath) {
    try {
      if (existsSync3(tempPath)) {
        unlinkSync(tempPath);
      }
      this.tempFiles.delete(tempPath);
    } catch {
      this.logger.warn(`Failed to cleanup temp file: ${tempPath}`);
    }
  }
  cleanupAll() {
    for (const tempPath of this.tempFiles) {
      this.cleanup(tempPath);
    }
    this.tempFiles.clear();
    this.removeHandlers();
  }
  removeHandlers() {
    if (this.exitHandler) {
      process.removeListener("exit", this.exitHandler);
    }
    if (this.sigintHandler) {
      process.removeListener("SIGINT", this.sigintHandler);
    }
    if (this.sigtermHandler) {
      process.removeListener("SIGTERM", this.sigtermHandler);
    }
    if (this.uncaughtExceptionHandler) {
      process.removeListener("uncaughtException", this.uncaughtExceptionHandler);
    }
    if (this.unhandledRejectionHandler) {
      process.removeListener("unhandledRejection", this.unhandledRejectionHandler);
    }
    this.cleanupHandlersRegistered = false;
  }
  generateTempPath() {
    const filename = `testdino-config-${randomUUID2()}.json`;
    return join4(tmpdir2(), filename);
  }
  registerCleanupHandlers() {
    this.removeHandlers();
    this.exitHandler = () => {
      this.cleanupAll();
    };
    process.on("exit", this.exitHandler);
    this.sigintHandler = () => {
      if (this.sigintHandler) {
        process.removeListener("SIGINT", this.sigintHandler);
      }
    };
    process.on("SIGINT", this.sigintHandler);
    this.sigtermHandler = () => {
      if (this.sigtermHandler) {
        process.removeListener("SIGTERM", this.sigtermHandler);
      }
    };
    process.on("SIGTERM", this.sigtermHandler);
    this.uncaughtExceptionHandler = (error) => {
      this.logger.error("Uncaught exception", error);
      this.cleanupAll();
      process.exit(1);
    };
    process.on("uncaughtException", this.uncaughtExceptionHandler);
    this.unhandledRejectionHandler = (reason) => {
      this.logger.error("Unhandled rejection", reason instanceof Error ? reason : void 0);
      this.cleanupAll();
      process.exit(1);
    };
    process.on("unhandledRejection", this.unhandledRejectionHandler);
  }
  getTempFiles() {
    return Array.from(this.tempFiles);
  }
};

// src/cli/playwright-spawner.ts
import { randomUUID as randomUUID3 } from "crypto";
import { readFileSync as readFileSync2, unlinkSync as unlinkSync2 } from "fs";
import { tmpdir as tmpdir3 } from "os";
import { join as join5 } from "path";
import { execa } from "execa";
var PlaywrightSpawner = class {
  logger;
  constructor(logger2) {
    this.logger = logger2 ?? new Logger();
  }
  async spawn(options) {
    const { args, tempConfigPath, config, cwd = process.cwd() } = options;
    const resultPath = join5(tmpdir3(), `testdino-result-${randomUUID3()}.json`);
    try {
      const env = {
        ...process.env,
        TESTDINO_CLI_CONFIG_PATH: tempConfigPath,
        TESTDINO_TOKEN: config.token,
        ...config.serverUrl !== void 0 && { TESTDINO_SERVER_URL: config.serverUrl },
        ...config.ciRunId !== void 0 && { TESTDINO_CI_RUN_ID: config.ciRunId },
        TESTDINO_DEBUG: config.debug ? "true" : "false",
        TESTDINO_RUN_RESULT_PATH: resultPath
      };
      const playwrightArgs = ["playwright", "test", "--reporter", "@testdino/playwright", ...args];
      const result = await execa("npx", playwrightArgs, {
        stdio: "inherit",
        // Forward stdout/stderr in real-time
        cwd,
        env,
        reject: false
        // Don't throw on non-zero exit codes
      });
      const exitCode = result.exitCode ?? 0;
      const totalTests = this.readTotalTests(resultPath);
      return {
        exitCode,
        success: exitCode === 0,
        resultsProduced: totalTests > 0,
        totalTests
      };
    } catch (error) {
      return this.handleSpawnError(error);
    } finally {
      try {
        unlinkSync2(resultPath);
      } catch {
      }
    }
  }
  // A missing or corrupt sentinel means the reporter never reached onEnd (globalSetup
  // crash, immediate spawn failure) — treat that as zero tests produced.
  readTotalTests(resultPath) {
    try {
      const parsed = JSON.parse(readFileSync2(resultPath, "utf-8"));
      return typeof parsed.totalTests === "number" ? parsed.totalTests : 0;
    } catch {
      return 0;
    }
  }
  handleSpawnError(error) {
    const execaError = error;
    if (execaError.code === "ENOENT") {
      this.logger.error("Failed to spawn Playwright");
      this.logger.newline();
      this.logger.info("Playwright is not installed or npx is not available.");
      this.logger.newline();
      this.logger.section("To install Playwright:");
      this.logger.code("npm install -D @playwright/test");
      this.logger.code("npx playwright install");
      return {
        exitCode: 1,
        success: false,
        resultsProduced: false,
        totalTests: 0
      };
    }
    if (execaError.code === "EACCES") {
      this.logger.error("Permission denied when trying to spawn Playwright");
      this.logger.newline();
      this.logger.info("Please check file permissions and try again.");
      return {
        exitCode: 1,
        success: false,
        resultsProduced: false,
        totalTests: 0
      };
    }
    this.logger.error("Failed to spawn Playwright");
    this.logger.newline();
    this.logger.info(`Error: ${execaError.message || String(error)}`);
    return {
      exitCode: 1,
      success: false,
      resultsProduced: false,
      totalTests: 0
    };
  }
};

// src/cli/commands/test.ts
var TestCommand = class {
  configLoader;
  configDetector;
  configMerger;
  argFilter;
  tempConfigManager;
  playwrightSpawner;
  constructor(configLoader, configDetector, configMerger, argFilter, tempConfigManager, playwrightSpawner, logger2) {
    this.configLoader = configLoader || new ConfigLoader();
    this.configDetector = configDetector || new ConfigDetector();
    this.configMerger = configMerger || new ConfigMerger();
    this.argFilter = argFilter || new ArgFilter();
    this.tempConfigManager = tempConfigManager || new TempConfigManager(logger2);
    this.playwrightSpawner = playwrightSpawner || new PlaywrightSpawner(logger2);
  }
  async execute(options, args) {
    let tempConfigPath;
    try {
      const testdinoConfigResult = await this.configLoader.load();
      const playwrightConfigResult = await this.configDetector.detect();
      const envConfig = ConfigMerger.getEnvConfig();
      const mergedConfig = this.configMerger.merge({
        env: envConfig,
        playwrightConfig: playwrightConfigResult.options,
        testdinoConfig: testdinoConfigResult.config,
        cliOptions: options
      });
      const tempConfigInfo = this.tempConfigManager.create(mergedConfig);
      tempConfigPath = tempConfigInfo.path;
      const filteredArgs = this.argFilter.filter(args);
      const result = await this.playwrightSpawner.spawn({
        args: filteredArgs,
        tempConfigPath,
        config: mergedConfig
      });
      return result;
    } finally {
      if (tempConfigPath) {
        this.tempConfigManager.cleanup(tempConfigPath);
      }
    }
  }
};

// src/utils/index.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isDebugEnabled() {
  return process.env.TESTDINO_DEBUG === "true" || process.env.TESTDINO_DEBUG === "1";
}

// src/cli/orchestrate/discover-command.ts
import { writeFileSync as writeFileSync3 } from "fs";
import { Command } from "commander";

// src/cli/orchestrate/dispatch-errors.ts
import { isAxiosError } from "axios";
var DispatchError = class extends Error {
  kind;
  httpStatus;
  serverCode;
  constructor(message, kind, httpStatus, serverCode) {
    super(message);
    this.name = "DispatchError";
    this.kind = kind;
    this.httpStatus = httpStatus;
    this.serverCode = serverCode;
  }
  // 408 (request timeout) and 429 (rate limit) are 4xx but retryable — exactly
  // what backoff is designed to ride out.
  get transient() {
    if (this.kind !== "client") return true;
    return this.httpStatus === 408 || this.httpStatus === 429;
  }
};
function classifyDispatchError(error) {
  if (error instanceof DispatchError) return error;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === void 0) {
      return new DispatchError(error.message || "network error", "network");
    }
    const code = extractCode(error.response?.data);
    const message = extractMessage(error.response?.data) ?? error.message;
    const kind = status >= 500 ? "server_error" : "client";
    return new DispatchError(message, kind, status, code);
  }
  return new DispatchError(error instanceof Error ? error.message : String(error), "network");
}
function extractCode(data) {
  const d = data;
  const nested = d?.error;
  if (typeof nested?.code === "string") return nested.code;
  if (typeof d?.code === "string") return d.code;
  return void 0;
}
function extractMessage(data) {
  const d = data;
  const nested = d?.error;
  if (typeof nested?.message === "string") return nested.message;
  if (typeof d?.message === "string") return d.message;
  return void 0;
}

// src/cli/orchestrate/machine-count.ts
function resolveMachineCount(sources = {}) {
  const raw = sources.flag?.trim() || sources.env?.trim();
  if (!raw) throw new InvalidMachineCountError();
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new InvalidMachineCountError(raw);
  return n;
}

// src/cli/orchestrate/discover-client.ts
import axios2 from "axios";
function describeMintError(err) {
  switch (err.httpStatus) {
    case 409:
      return "already minted for this suite with different machines/workers/fullyParallel";
    case 422:
      return "no specs, or more than 50000 specs";
    case 404:
      return "project not found or access denied";
    default:
      return err.message;
  }
}
var HttpDiscoverClient = class {
  http;
  maxAttempts;
  retryDelay;
  onDebug;
  constructor(options) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.retryDelay = options.retryDelay ?? 500;
    this.onDebug = options.onDebug ?? (() => {
    });
    this.http = axios2.create({
      baseURL: options.serverUrl,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.token}` },
      timeout: options.timeout ?? 15e3
    });
  }
  async mint(req) {
    let lastError = null;
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const res = await this.http.post("/api/v1/orchestrate/discover", req);
        return res.data;
      } catch (error) {
        const classified = classifyDispatchError(error);
        lastError = classified;
        if (!classified.transient) throw classified;
        if (attempt < this.maxAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          this.onDebug(`mint transient (${classified.kind}/${classified.httpStatus ?? "?"}) \u2014 retrying in ${delay}ms`);
          await sleep(delay);
        }
      }
    }
    throw lastError ?? new DispatchError("mint failed", "network");
  }
};

// src/cli/orchestrate/playwright-list-runner.ts
import { execa as execa2 } from "execa";
function buildListArgs(grep, projects = []) {
  return [
    "playwright",
    "test",
    "--list",
    "--reporter=json",
    ...grep ? ["--grep", grep] : [],
    ...projects.flatMap((p) => ["--project", p])
  ];
}
var PlaywrightListRunner = class {
  async list(options = {}) {
    const { grep, projects = [], cwd = process.cwd(), env = process.env } = options;
    const args = buildListArgs(grep, projects);
    let result;
    try {
      result = await execa2("npx", args, { cwd, env, reject: false, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      const code = error.code;
      if (code === "ENOENT") {
        throw new DiscoveryFailedError("Playwright is not installed or npx is not available.");
      }
      throw new DiscoveryFailedError(error instanceof Error ? error.message : String(error));
    }
    const stdout = result.stdout ?? "";
    if (result.exitCode !== 0 && !stdout.trim()) {
      throw new DiscoveryFailedError(result.stderr || `playwright exited with code ${result.exitCode}`);
    }
    try {
      return JSON.parse(stdout);
    } catch (error) {
      throw new DiscoveryFailedError(
        `could not parse --list JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};

// src/cli/orchestrate/unit-builder.ts
import { createHash } from "crypto";
function buildUnits(report) {
  const byKey = /* @__PURE__ */ new Map();
  const visit = (suite, titleChain) => {
    const chain = [...titleChain, suite.title];
    for (const spec of suite.specs ?? []) {
      const tags = spec.tags ?? [];
      for (const test of spec.tests ?? []) {
        const key = JSON.stringify([spec.file, test.projectName]);
        let unit = byKey.get(key);
        if (!unit) {
          unit = { file: spec.file, project: test.projectName, tags: [], tests: [] };
          byKey.set(key, unit);
        }
        unit.tests.push({
          title: spec.title,
          titlePath: [test.projectName, ...chain, spec.title],
          tags,
          line: spec.line,
          column: spec.column
        });
        for (const tag of tags) {
          if (!unit.tags.includes(tag)) unit.tags.push(tag);
        }
      }
    }
    for (const child of suite.suites ?? []) visit(child, chain);
  };
  for (const fileSuite of report.suites ?? []) visit(fileSuite, []);
  return [...byKey.values()].sort((a, b) => a.file.localeCompare(b.file) || a.project.localeCompare(b.project));
}
function computeSuiteFingerprint(units, grep) {
  const keys = units.map((u) => `${u.file}|${u.project}`).sort();
  const base = keys.join("\n");
  const input = grep ? `${base}\0grep=${grep}` : base;
  return createHash("sha256").update(input).digest("hex");
}
function buildDiscoverSpecs(units) {
  const byFile = /* @__PURE__ */ new Map();
  for (const unit of units) {
    let spec = byFile.get(unit.file);
    if (!spec) {
      spec = { file: unit.file, tests: [] };
      byFile.set(unit.file, spec);
    }
    for (const test of unit.tests) {
      spec.tests.push({ titlePath: test.titlePath });
    }
  }
  return [...byFile.values()];
}

// src/cli/orchestrate/discover-mint.ts
var DiscoverMintCommand = class {
  constructor(listRunner = new PlaywrightListRunner(), client) {
    this.listRunner = listRunner;
    this.client = client;
  }
  listRunner;
  client;
  async execute(input) {
    const report = await this.listRunner.list({ grep: input.grep, projects: input.project });
    const units = buildUnits(report);
    const totalTests = units.reduce((n, u) => n + u.tests.length, 0);
    if (totalTests === 0) throw new NoTestsDiscoveredError(input.grep, input.project);
    const suiteFingerprint = computeSuiteFingerprint(units, input.grep);
    const specs = buildDiscoverSpecs(units);
    const response = await this.client.mint({
      suiteFingerprint,
      machines: input.machines,
      workers: input.workers,
      fullyParallel: input.fullyParallel,
      specs,
      ...input.grep ? { grep: input.grep } : {}
    });
    return { ...response, suiteFingerprint, totalTests };
  }
};

// src/cli/orchestrate/discover-command.ts
function buildDiscoverCommand(logger2) {
  return new Command("discover").description("Discover the filtered test set and mint an orchestration (no tests are executed)").option("--grep <pattern>", "Only include tests matching the pattern (Playwright --grep)").option("--project <name...>", "Restrict discovery to one or more Playwright projects").option(
    "--machines <N>",
    "Number of machines to distribute across (or TESTDINO_MACHINES). Workers (W) is read from the Playwright config file and may differ from the runtime-effective workers if the run passes --workers / PLAYWRIGHT_WORKERS."
  ).option("--token <token>", "TestDino pipeline token (or TESTDINO_TOKEN)").option("--server-url <url>", "TestDino server URL").option("--out <file>", "Write the mint response (including orchestrationId) as JSON").option("--debug", "Enable debug logging").action(async (options) => {
    if (options.debug) logger2.setDebug(true);
    try {
      const machines = resolveMachineCount({ flag: options.machines, env: process.env.TESTDINO_MACHINES });
      const testdinoConfig = await new ConfigLoader().load();
      const detection = await new ConfigDetector().detect();
      const merged = new ConfigMerger().merge({
        env: ConfigMerger.getEnvConfig(),
        playwrightConfig: detection.options,
        testdinoConfig: testdinoConfig.config,
        cliOptions: { token: options.token, serverUrl: options.serverUrl, debug: options.debug }
      });
      if (!merged.token) throw new TokenMissingError();
      const workers = detection.workers ?? 1;
      if (detection.workers === void 0) {
        logger2.warn(
          "workers not set to a positive integer in the Playwright config (a percentage cannot be resolved at discover time) \u2014 defaulting to 1; set an integer for accurate distribution"
        );
      }
      const fullyParallel = detection.fullyParallel ?? false;
      const client = new HttpDiscoverClient({
        token: merged.token,
        serverUrl: merged.serverUrl ?? "",
        onDebug: (m) => logger2.debug(m)
      });
      const result = await new DiscoverMintCommand(void 0, client).execute({
        grep: options.grep,
        project: options.project,
        machines,
        workers,
        fullyParallel
      });
      logger2.success(
        result.created ? `Minted orchestration ${result.orchestrationId}` : `Orchestration ${result.orchestrationId} already minted for this suite (idempotent retry)`
      );
      logger2.listItem(`machines: ${result.machines}`);
      logger2.listItem(`workers: ${result.workers}`);
      logger2.listItem(`fullyParallel: ${result.fullyParallel}`);
      logger2.listItem(`specCount: ${result.specCount}`);
      if (options.out) {
        writeFileSync3(options.out, `${JSON.stringify(result, null, 2)}
`, "utf-8");
        logger2.listItem(`mint response written to ${options.out}`);
      }
    } catch (error) {
      if (error instanceof DispatchError) {
        logger2.error(`Discovery mint failed: ${describeMintError(error)}`);
      } else if (error instanceof TestDinoError) {
        logger2.error(error.message);
      } else {
        logger2.error(
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : void 0
        );
      }
      process.exitCode = 1;
    }
  });
}

// src/cli/orchestrate/run-command.ts
import { Command as Command2 } from "commander";

// src/cli/orchestrate/device-id.ts
import { hostname } from "os";
function resolveDeviceId(sources = {}) {
  const flag = sources.flag?.trim();
  if (flag) return flag;
  const env = sources.env ?? process.env;
  const explicit = env.TESTDINO_DEVICE_ID?.trim();
  if (explicit) return explicit;
  const ciIndex = env.CI_NODE_INDEX?.trim() || env.CIRCLE_NODE_INDEX?.trim();
  if (ciIndex) return `ci-${ciIndex}`;
  return `${hostname()}-${process.pid}`;
}

// src/cli/orchestrate/run-loop.ts
import { randomUUID as randomUUID4 } from "crypto";

// src/cli/orchestrate/ws-client.ts
import WebSocket from "ws";

// src/cli/orchestrate/ws-url.ts
function buildOrchestrateWsUrl(serverUrl, orchestrationId, machineId) {
  let url;
  try {
    url = new URL(serverUrl);
  } catch {
    throw new InvalidServerUrlError(serverUrl);
  }
  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  else throw new InvalidServerUrlError(serverUrl);
  url.pathname = "/ws/orchestrate/" + encodeURIComponent(orchestrationId);
  url.search = "";
  url.searchParams.set("machineId", machineId);
  return url.toString();
}

// src/cli/orchestrate/ws-client.ts
var OrchestrateWsError = class extends Error {
  kind;
  constructor(message, kind) {
    super(message);
    this.name = "OrchestrateWsError";
    this.kind = kind;
  }
};
var OrchestrateWsClient = class {
  constructor(options) {
    this.options = options;
    this.onAssign = options.onAssign;
    this.onOpen = options.onOpen ?? (() => {
    });
    this.onEnd = options.onEnd ?? (() => {
    });
    this.onError = options.onError ?? (() => {
    });
    this.onDebug = options.onDebug ?? (() => {
    });
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.baseReconnectDelayMs = options.baseReconnectDelayMs ?? 1e3;
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 3e4;
    this.handshakeTimeoutMs = options.handshakeTimeoutMs ?? 15e3;
    this.livenessTimeoutMs = options.livenessTimeoutMs ?? 7e4;
  }
  options;
  onAssign;
  onOpen;
  onEnd;
  onError;
  onDebug;
  maxReconnectAttempts;
  baseReconnectDelayMs;
  maxReconnectDelayMs;
  handshakeTimeoutMs;
  livenessTimeoutMs;
  ws = null;
  connectPromise = null;
  resolveConnect = null;
  rejectConnect = null;
  settled = false;
  closedByCaller = false;
  attempt = 0;
  reconnectTimer = null;
  livenessTimer = null;
  // Runs the whole session. The returned promise resolves ONCE, when the hub sends
  // an end frame ('ended') or the caller calls close() ('closed'), and rejects on a
  // fatal error (auth/protocol/exhausted). Do NOT await it before acking — acks are
  // issued from the onAssign / onOpen callbacks while the session is live; awaiting
  // connect() first would block until the session is already over.
  connect() {
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = new Promise((resolve, reject) => {
      this.resolveConnect = resolve;
      this.rejectConnect = reject;
    });
    this.openSocket();
    return this.connectPromise;
  }
  // Sends an ack frame only on an open socket. Returns false (and debug-logs) when
  // the socket is down or the send throws (a CLOSING race): the caller must retry
  // — from onOpen once reconnected — because a dropped ack means the server never
  // learns those runIds landed. The 256KiB frame cap is generous for runIds.
  ack(runIds) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onDebug(`ack skipped: socket not open (${runIds.length} runIds)`);
      return false;
    }
    try {
      this.ws.send(JSON.stringify({ action: "ack", runIds }));
      return true;
    } catch (err) {
      this.onDebug(`ack send failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
  close() {
    this.closedByCaller = true;
    this.clearReconnectTimer();
    this.clearLivenessTimer();
    if (this.ws) this.ws.close(1e3);
    this.resolveWith("closed");
  }
  openSocket() {
    if (this.settled || this.closedByCaller) return;
    const url = buildOrchestrateWsUrl(this.options.serverUrl, this.options.orchestrationId, this.options.machineId);
    const socket = new WebSocket(url, {
      headers: { Authorization: `Bearer ${this.options.token}` },
      handshakeTimeout: this.handshakeTimeoutMs
    });
    this.ws = socket;
    socket.on("open", () => {
      if (socket !== this.ws) return;
      this.attempt = 0;
      this.resetLivenessTimer();
      this.onDebug("orchestrate socket open");
      this.safeInvoke(() => this.onOpen(), "onOpen");
    });
    socket.on("message", (data) => {
      if (socket !== this.ws) return;
      this.resetLivenessTimer();
      this.handleMessage(data);
    });
    socket.on("ping", () => {
      if (socket !== this.ws) return;
      this.resetLivenessTimer();
    });
    socket.on("error", (err) => {
      if (socket !== this.ws) return;
      this.onDebug(`orchestrate socket error: ${err.message}`);
      this.scheduleReconnect();
    });
    socket.on("close", () => {
      if (socket !== this.ws) return;
      this.scheduleReconnect();
    });
    socket.on("unexpected-response", (_req, res) => {
      if (socket !== this.ws) return;
      const status = res.statusCode ?? 0;
      const retryable = status === 408 || status === 425 || status === 429;
      if (status >= 400 && status < 500 && !retryable) {
        this.rejectWith(`orchestrate handshake rejected with ${status}`, "auth");
      } else {
        this.onDebug(`orchestrate handshake responded ${status} \u2014 reconnecting`);
        this.scheduleReconnect();
      }
      socket.terminate();
    });
  }
  handleMessage(data) {
    if (this.settled) return;
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      this.onDebug("ignoring non-JSON frame");
      return;
    }
    if (!msg || typeof msg !== "object") {
      this.onDebug("ignoring malformed frame");
      return;
    }
    const frame = msg;
    switch (frame.event) {
      case "assign": {
        if (!Array.isArray(frame.specs) || !frame.specs.every((s) => typeof s === "string")) {
          this.onDebug("ignoring assign frame with malformed specs");
          return;
        }
        const grep = typeof frame.grep === "string" ? frame.grep : void 0;
        this.safeInvoke(() => this.onAssign(frame.specs, grep), "onAssign");
        return;
      }
      case "end": {
        this.resolveWith("ended");
        this.safeInvoke(() => this.onEnd(), "onEnd");
        this.ws?.close(1e3);
        return;
      }
      case "error": {
        const payload = frame.data;
        const message = typeof payload?.message === "string" ? payload.message : "orchestration error";
        this.rejectWith(message, "protocol");
        this.safeInvoke(() => this.onError(message), "onError");
        return;
      }
      default:
        this.onDebug(`ignoring frame with unknown event: ${String(frame.event)}`);
    }
  }
  scheduleReconnect() {
    this.clearLivenessTimer();
    if (this.settled || this.closedByCaller) return;
    if (this.reconnectTimer) return;
    this.attempt++;
    if (this.attempt > this.maxReconnectAttempts) {
      this.rejectWith(`orchestrate socket unreachable after ${this.maxReconnectAttempts} attempts`, "exhausted");
      return;
    }
    const delay = this.backoffDelay(this.attempt);
    this.onDebug(`orchestrate reconnect attempt ${this.attempt} in ${Math.round(delay)}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }
  backoffDelay(attempt) {
    const capped = Math.min(this.baseReconnectDelayMs * Math.pow(2, attempt - 1), this.maxReconnectDelayMs);
    return capped * (0.8 + Math.random() * 0.4);
  }
  // Terminates a socket that has gone quiet past livenessTimeoutMs (half-open, no
  // FIN). terminate() fires 'close' → scheduleReconnect.
  resetLivenessTimer() {
    this.clearLivenessTimer();
    if (this.settled || this.closedByCaller) return;
    const socket = this.ws;
    this.livenessTimer = setTimeout(() => {
      this.livenessTimer = null;
      if (socket !== this.ws) return;
      this.onDebug(`orchestrate socket silent for ${this.livenessTimeoutMs}ms \u2014 terminating to reconnect`);
      socket?.terminate();
    }, this.livenessTimeoutMs);
  }
  clearLivenessTimer() {
    if (this.livenessTimer) {
      clearTimeout(this.livenessTimer);
      this.livenessTimer = null;
    }
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  // Invokes a caller callback without letting its throw escape (which would abort a
  // ws EventEmitter handler and can crash the process); the failure is debug-logged.
  safeInvoke(fn, label) {
    try {
      fn();
    } catch (err) {
      this.onDebug(`${label} callback threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  resolveWith(outcome) {
    if (this.settled) return;
    this.settled = true;
    this.clearLivenessTimer();
    this.clearReconnectTimer();
    this.resolveConnect?.(outcome);
  }
  rejectWith(message, kind) {
    if (this.settled) return;
    this.settled = true;
    this.clearLivenessTimer();
    this.clearReconnectTimer();
    if (this.ws) this.ws.close(1e3);
    this.rejectConnect?.(new OrchestrateWsError(message, kind));
  }
};

// src/cli/orchestrate/run-loop.ts
var OrchestrateRunLoop = class {
  serverUrl;
  token;
  orchestrationId;
  machineId;
  passthroughArgs;
  debug;
  logger;
  testCommand;
  clientFactory;
  client = null;
  // The discover --grep echoed by the hub, re-applied to each batch so a runner
  // executes only the discovered tests, not every test in the assigned files.
  assignGrep;
  busy = false;
  // Single-slot: one queued assign absorbs the benign race of a second assign
  // arriving while a batch runs; a third (already-queued) is a protocol violation.
  queued = null;
  // runIds whose ack was dropped by a socket-down send; re-issued from onOpen.
  pendingAcks = [];
  reconnectRequested = false;
  sigintRequested = false;
  fatalOverlap = false;
  constructor(options) {
    this.serverUrl = options.serverUrl;
    this.token = options.token;
    this.orchestrationId = options.orchestrationId;
    this.machineId = options.machineId;
    this.passthroughArgs = options.passthroughArgs;
    this.debug = options.debug ?? false;
    this.logger = options.logger;
    this.testCommand = options.testCommand ?? new TestCommand(void 0, void 0, void 0, void 0, void 0, void 0, this.logger);
    this.clientFactory = options.clientFactory ?? ((opts) => new OrchestrateWsClient(opts));
  }
  async run() {
    const onSigint = () => {
      this.sigintRequested = true;
      this.client?.close();
    };
    process.on("SIGINT", onSigint);
    try {
      for (; ; ) {
        this.client = this.buildClient();
        let outcome;
        try {
          outcome = await this.client.connect();
        } catch (error) {
          if (error instanceof OrchestrateWsError) {
            this.logger.error(`Orchestration session failed: ${error.message}`);
            return 1;
          }
          throw error;
        }
        if (this.fatalOverlap) return 1;
        if (outcome === "ended") return 0;
        if (this.sigintRequested) return 130;
        if (this.reconnectRequested) {
          this.reconnectRequested = false;
          continue;
        }
        return 0;
      }
    } finally {
      process.removeListener("SIGINT", onSigint);
    }
  }
  buildClient() {
    const options = {
      serverUrl: this.serverUrl,
      token: this.token,
      orchestrationId: this.orchestrationId,
      machineId: this.machineId,
      onAssign: (specs, grep) => this.onAssign(specs, grep),
      onOpen: () => this.onOpen(),
      onDebug: this.debug ? (m) => this.logger.debug(m) : void 0
    };
    return this.clientFactory(options);
  }
  // onAssign is a SYNC ws callback — it must NOT await the run, or it blocks the
  // socket's read pump. It schedules processAssign fire-and-forget behind a busy guard.
  onAssign(specs, grep) {
    this.assignGrep = grep;
    if (this.busy) {
      if (this.queued !== null) {
        this.fatalOverlap = true;
        this.logger.error("Orchestration protocol violation: a second batch was assigned while one was already queued");
        this.client?.close();
        return;
      }
      this.queued = specs;
      return;
    }
    this.busy = true;
    void this.processAssign(specs);
  }
  async processAssign(specs) {
    try {
      if (specs.length === 0) {
        this.logger.debug("Received an empty batch (no specs); requeuing via reconnect");
        this.reconnectRequested = true;
        this.client?.close();
        return;
      }
      const runId = randomUUID4();
      const result = await this.testCommand.execute(
        {
          token: this.token,
          serverUrl: this.serverUrl,
          debug: this.debug,
          orchestrationId: this.orchestrationId,
          runId,
          deviceId: this.machineId
        },
        [...this.passthroughArgs, ...this.grepArgs(), ...specs]
      );
      if (result.resultsProduced) {
        const acked = this.client?.ack([runId]) ?? false;
        if (!acked) this.pendingAcks.push(runId);
      } else {
        this.reconnectRequested = true;
        this.client?.close();
      }
    } catch (error) {
      this.reconnectRequested = true;
      this.logger.error(
        `Orchestration batch execution error: ${error instanceof Error ? error.message : String(error)}`
      );
      this.client?.close();
    } finally {
      this.busy = false;
      if (this.queued !== null) {
        if (this.reconnectRequested || this.sigintRequested || this.fatalOverlap) {
          this.queued = null;
        } else {
          const next = this.queued;
          this.queued = null;
          this.busy = true;
          void this.processAssign(next);
        }
      }
    }
  }
  // The propagated discover --grep, as playwright args — unless the caller already
  // passed a --grep in passthrough (an explicit override wins over the session grep).
  grepArgs() {
    if (!this.assignGrep) return [];
    const hasOwnGrep = this.passthroughArgs.some((a) => a === "--grep" || a.startsWith("--grep=") || a === "-g");
    return hasOwnGrep ? [] : ["--grep", this.assignGrep];
  }
  // The only retry trigger for a dropped ack: a reconnect fires onOpen, and any
  // ack that ack() dropped while the socket was down is re-issued on the fresh socket.
  onOpen() {
    if (this.pendingAcks.length === 0) return;
    const acked = this.client?.ack(this.pendingAcks) ?? false;
    if (acked) this.pendingAcks = [];
  }
};

// src/cli/orchestrate/run-command.ts
function buildRunCommand(logger2) {
  return new Command2("run").description("Join an orchestration on this machine and run the test batches assigned to it").requiredOption(
    "--orchestration-id <id>",
    "Orchestration id shared by every machine of one orchestrated run (from `orchestrate discover`)"
  ).option("--device-id <id>", "Stable id for this machine (or TESTDINO_DEVICE_ID)").option("--token <token>", "TestDino pipeline token (or TESTDINO_TOKEN)").option("--server-url <url>", "TestDino server URL").option("--debug", "Enable debug logging").allowUnknownOption().allowExcessArguments().action(async (options, command) => {
    if (options.debug) logger2.setDebug(true);
    try {
      const machineId = resolveDeviceId({ flag: options.deviceId });
      const testdinoConfig = await new ConfigLoader().load();
      const detection = await new ConfigDetector().detect();
      const merged = new ConfigMerger().merge({
        env: ConfigMerger.getEnvConfig(),
        playwrightConfig: detection.options,
        testdinoConfig: testdinoConfig.config,
        cliOptions: { token: options.token, serverUrl: options.serverUrl, debug: options.debug }
      });
      if (!merged.token) throw new TokenMissingError();
      const loop = new OrchestrateRunLoop({
        serverUrl: merged.serverUrl ?? "",
        token: merged.token,
        orchestrationId: options.orchestrationId,
        machineId,
        passthroughArgs: command.args ?? [],
        debug: options.debug,
        logger: logger2
      });
      process.exitCode = await loop.run();
    } catch (error) {
      if (error instanceof TestDinoError) {
        logger2.error(error.message);
      } else {
        logger2.error(
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : void 0
        );
      }
      process.exitCode = 1;
    }
  });
}

// src/cli/index.ts
var logger = new Logger(isDebugEnabled());
function buildProgram() {
  const program = new Command3().name("tdpw").description("Run Playwright tests with TestDino reporting").version(getPackageVersion(), "-v, --version", "Output the current version").helpOption("-h, --help", "Display help for command");
  program.command("test").description("Run Playwright tests with TestDino reporter").option("-t, --token <token>", "TestDino authentication token").option("--ci-run-id <id>", "CI run ID for grouping test runs").option("--server-url <url>", "TestDino server URL").option("--debug", "Enable debug logging").option("--no-artifacts", "Disable artifact uploads (screenshots, videos, traces)").option("--coverage", "Enable code coverage collection").option("--tags <tags>", "Comma-separated run-level tags (e.g. smoke,prod)").option("--split <current/total>", "Manual split index/total (e.g. 1/5) \u2014 requires --split-id").option("--split-id <id>", "Group ID correlating all splits of one logical run").allowUnknownOption().allowExcessArguments().action(async (options, command) => {
    if (options.debug) {
      logger.setDebug(true);
    }
    const updatePromise = checkForUpdate(getPackageVersion()).catch(() => void 0);
    const printUpdateNotice = async () => {
      try {
        const latestVersion = await awaitUpdateResult(updatePromise);
        if (latestVersion) {
          logger.updateNotice(getPackageVersion(), latestVersion);
        }
      } catch {
      }
    };
    try {
      const args = command.args || [];
      const testCommand = new TestCommand(void 0, void 0, void 0, void 0, void 0, void 0, logger);
      const result = await testCommand.execute(options, args);
      await printUpdateNotice();
      process.exit(result.exitCode);
    } catch (error) {
      if (error instanceof TestDinoError) {
        logger.error(error.message);
      } else {
        logger.error(
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : void 0
        );
      }
      await printUpdateNotice();
      process.exit(1);
    }
  });
  const orchestrate = new Command3("orchestrate").description(
    "Distribute a Playwright suite across runners (orchestrated runs)"
  );
  orchestrate.addCommand(buildDiscoverCommand(logger));
  orchestrate.addCommand(buildRunCommand(logger));
  program.addCommand(orchestrate);
  return program;
}
async function main() {
  try {
    logger.banner(getPackageVersion());
    const program = buildProgram();
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof TestDinoError) {
      logger.error(error.message);
    } else {
      logger.error(error instanceof Error ? error.message : String(error), error instanceof Error ? error : void 0);
    }
    process.exit(1);
  }
}
main().catch((error) => {
  logger.error("Unexpected error", error instanceof Error ? error : void 0);
  process.exit(1);
});
//# sourceMappingURL=index.mjs.map