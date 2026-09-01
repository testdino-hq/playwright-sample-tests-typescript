import { Reporter, FullConfig, Suite, TestCase, TestResult, TestStep, FullResult, TestError } from '@playwright/test/reporter';
import * as playwright_test from 'playwright/test';
import { Page, TestInfo } from '@playwright/test';
export { expect } from '@playwright/test';

interface MetadataCollector<T = Record<string, unknown>> {
    collect(): Promise<T>;
    getName(): string;
}
interface MetadataCollectionResult<T = Record<string, unknown>> {
    data: T;
    success: boolean;
    error?: string;
    duration: number;
    collector: string;
}
interface GitMetadata {
    branch?: string;
    commit?: {
        hash?: string;
        message?: string;
        author?: string;
        authorId?: string;
        email?: string;
        timestamp?: string;
        isDirty?: boolean;
    };
    repository?: {
        name?: string;
        url?: string;
    };
    pr?: PRMetadata;
}
interface CIMetadata {
    provider?: string;
    pipeline?: {
        id?: string;
        name?: string;
        url?: string;
    };
    build?: {
        number?: string;
        trigger?: string;
    };
    environment?: {
        name?: string;
        type?: string;
        os?: string;
        node?: string;
    };
}
interface PRMetadata {
    title?: string;
    number?: number;
    url?: string;
    status?: string;
    branch?: string;
    targetBranch?: string;
    author?: string;
    labels?: string[];
    merged?: boolean;
    mergeable?: boolean;
    mergeCommitSha?: string;
}
interface SystemMetadata {
    os?: string;
    cpu?: string;
    memory?: string;
    nodeVersion?: string;
    platform?: string;
    hostname?: string;
}
interface SkeletonTest {
    testId: string;
    title: string;
    location: {
        file: string;
        line: number;
        column: number;
    };
    tags?: string[];
    expectedStatus?: string;
    annotations?: Array<{
        type: string;
        description?: string;
    }>;
}
interface SkeletonSuite {
    title: string;
    file?: string;
    type: 'describe' | 'file';
    location?: {
        file: string;
        line: number;
        column: number;
    };
    tests: SkeletonTest[];
    suites?: SkeletonSuite[];
}
interface RunSkeleton {
    totalTests: number;
    suites: SkeletonSuite[];
}
interface ProjectUseOptions {
    browserName?: 'chromium' | 'firefox' | 'webkit';
    channel?: string;
    headless?: boolean;
    viewport?: {
        width: number;
        height: number;
    } | null;
    baseURL?: string;
    trace?: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry' | string;
    screenshot?: 'off' | 'on' | 'only-on-failure' | string;
    video?: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry' | string;
    isMobile?: boolean;
    locale?: string;
}
interface ProjectConfig {
    name: string;
    testDir?: string;
    timeout?: number;
    retries?: number;
    repeatEach?: number;
    dependencies?: string[];
    grep?: string[];
    use?: ProjectUseOptions;
}
interface PlaywrightMetadata {
    version?: string;
    parallel?: boolean;
    workers?: number;
    shard?: ShardMetadata;
    projects?: ProjectConfig[];
    browsers?: string[];
    configFile?: string;
    forbidOnly?: boolean;
    fullyParallel?: boolean;
    globalTimeout?: number;
    grep?: string[];
    maxFailures?: number;
    metadata?: Record<string, unknown>;
    reportSlowTests?: {
        max: number;
        threshold: number;
    };
    rootDir?: string;
    tags?: string[];
    webServer?: Record<string, unknown>;
}
interface ShardMetadata {
    current?: number;
    total?: number;
}
interface CompleteMetadata {
    git?: GitMetadata;
    ci?: CIMetadata;
    system?: SystemMetadata;
    playwright?: PlaywrightMetadata;
    skeleton?: RunSkeleton;
}
interface MetadataCollectionSummary {
    metadata: CompleteMetadata;
    results: MetadataCollectionResult[];
    totalDuration: number;
    successCount: number;
    failureCount: number;
}

type IstanbulCoverageMap = Record<string, IstanbulFileCoverage>;
interface IstanbulFileCoverage {
    path: string;
    statementMap: Record<string, {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    }>;
    fnMap: Record<string, {
        name: string;
        decl: {
            start: {
                line: number;
                column: number;
            };
            end: {
                line: number;
                column: number;
            };
        };
        loc: {
            start: {
                line: number;
                column: number;
            };
            end: {
                line: number;
                column: number;
            };
        };
    }>;
    branchMap: Record<string, {
        type: string;
        loc: {
            start: {
                line: number;
                column: number;
            };
            end: {
                line: number;
                column: number;
            };
        };
        locations: Array<{
            start: {
                line: number;
                column: number;
            };
            end: {
                line: number;
                column: number;
            };
        }>;
    }>;
    s: Record<string, number>;
    f: Record<string, number>;
    b: Record<string, number[]>;
}
interface CoverageFragment {
    istanbul: IstanbulCoverageMap | null;
}
interface CoverageMetric {
    total: number;
    covered: number;
    pct: number;
}
interface CoverageSummary {
    lines: CoverageMetric;
    branches: CoverageMetric;
    functions: CoverageMetric;
    statements: CoverageMetric;
}
interface FileCoverage {
    path: string;
    lines: CoverageMetric;
    branches: CoverageMetric;
    functions: CoverageMetric;
    statements: CoverageMetric;
}
interface CompactFileCounts {
    s: Record<string, number>;
    f: Record<string, number>;
    b: Record<string, number[]>;
    totals: {
        s: number;
        f: number;
        b: number;
    };
    shapeHash: string;
}
interface CompactCoverageData {
    files: Record<string, CompactFileCounts>;
    fileCount: number;
}
interface CoverageThresholds {
    statements?: number;
    branches?: number;
    functions?: number;
    lines?: number;
}
interface CoverageConfig {
    enabled: boolean;
    include?: string[];
    exclude?: string[];
    thresholds?: CoverageThresholds;
}

type CoverageFixtures = {
    _testdinoCoverage: void;
};
declare const coverageFixtures: {
    _testdinoCoverage: ((({ page }: {
        page: Page;
    }, use: () => Promise<void>, testInfo: TestInfo) => Promise<void>) | {
        auto: boolean;
    })[];
};
declare const test: playwright_test.TestType<playwright_test.PlaywrightTestArgs & playwright_test.PlaywrightTestOptions & CoverageFixtures, playwright_test.PlaywrightWorkerArgs & playwright_test.PlaywrightWorkerOptions>;

declare class TestDinoServerError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
declare class QuotaExhaustedError extends TestDinoServerError {
    readonly details: {
        planName: string;
        totalLimit: number;
        used: number;
        resetDate?: string;
    };
    constructor(message: string, details: {
        planName: string;
        totalLimit: number;
        used: number;
        resetDate?: string;
    });
}
declare class QuotaExceededError extends TestDinoServerError {
    readonly details: {
        planName: string;
        totalTests: number;
        remaining: number;
        used: number;
        total: number;
        resetDate?: string;
        canPartialSubmit: boolean;
        allowedCount: number;
        projectName?: string;
        projectLimit?: number;
        projectUsed?: number;
        projectBorrowed?: number;
    };
    constructor(message: string, details: {
        planName: string;
        totalTests: number;
        remaining: number;
        used: number;
        total: number;
        resetDate?: string;
        canPartialSubmit: boolean;
        allowedCount: number;
        projectName?: string;
        projectLimit?: number;
        projectUsed?: number;
        projectBorrowed?: number;
    });
}
declare class InvalidTokenTypeError extends TestDinoServerError {
    constructor(message?: string);
}
declare class ForbiddenAuthError extends TestDinoServerError {
    constructor(message?: string);
}
declare class ServerEndpointError extends TestDinoServerError {
    constructor(path: string);
}
declare class UnauthorizedError extends TestDinoServerError {
    constructor(message?: string);
}
type ServerError = QuotaExhaustedError | QuotaExceededError | InvalidTokenTypeError | ForbiddenAuthError | ServerEndpointError | UnauthorizedError;

interface SessionCreationQuotaResponse {
    success: false;
    message: string;
    error: 'QUOTA_EXHAUSTED';
    details: {
        planName: string;
        totalLimit: number;
        used: number;
        resetDate?: string;
    };
}
interface NackMessage {
    type: 'nack';
    eventId: string;
    error: string | ServerError;
    retryable: boolean;
    timestamp: number;
}

declare const DEFAULT_SERVER_URL = "https://reporter.testdino.com";

interface TestdinoConfig {
    token?: string;
    ciRunId?: string;
    splitId?: string;
    orchestrationId?: string;
    serverUrl?: string;
    debug?: boolean;
    artifacts?: boolean;
    coverage?: CoverageConfig;
    tags?: string[];
}
type TestEvent = TestRunBeginEvent | TestBeginEvent | TestStepBeginEvent | TestStepEndEvent | TestEndEvent | TestRunEndEvent | TestRunErrorEvent | TestConsoleOutEvent | TestConsoleErrEvent | CoverageDataEvent | CompressedCoverageDataEvent | RunHeartbeatEvent;
interface Annotation {
    type: string;
    description?: string;
}
interface BaseEvent {
    type: string;
    timestamp: number;
    runId: string;
    sequence: number;
}
interface TestRunBeginEvent extends BaseEvent {
    type: 'run:begin';
    projectId: string;
    metadata: CompleteMetadata;
    ciRunId?: string;
    shard?: {
        current: number;
        total: number;
    };
    splitId?: string;
    orchestrationId?: string;
    split?: {
        current: number;
        total: number;
    };
    coverageEnabled?: boolean;
    tags?: string[];
}
interface TestBeginEvent extends BaseEvent {
    type: 'test:begin';
    testId: string;
    title: string;
    titlePath: Array<string>;
    location: {
        file: string;
        line: number;
        column: number;
    };
    tags: Array<string>;
    expectedStatus: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
    timeout: number;
    retries: number;
    annotations: Array<Annotation>;
    retry: number;
    workerIndex: number;
    parallelIndex: number;
    repeatEachIndex?: number;
    parentSuite: {
        title: string;
        type: 'root' | 'project' | 'file' | 'describe';
        location?: {
            file: string;
            line: number;
            column: number;
        };
    };
    startTime: number;
}
interface TestStepBeginEvent extends BaseEvent {
    type: 'step:begin';
    testId: string;
    stepId: string;
    title: string;
    titlePath: Array<string>;
    category: string;
    location?: {
        file: string;
        line: number;
        column: number;
    };
    parentStep?: {
        title: string;
        category: string;
        location?: {
            file: string;
            line: number;
            column: number;
        };
    };
    startTime: number;
    retry: number;
    workerIndex: number;
    parallelIndex: number;
    annotations: Array<Annotation>;
}
interface TestStepEndEvent extends BaseEvent {
    type: 'step:end';
    testId: string;
    stepId: string;
    title?: string;
    titlePath?: string[];
    duration: number;
    error?: {
        message: string;
        stack?: string;
        snippet?: string;
        value?: string;
        location?: {
            file: string;
            line: number;
            column: number;
        };
    };
    status: 'passed' | 'failed';
    childSteps: {
        count: number;
        steps: Array<{
            title: string;
            status: 'passed' | 'failed';
        }>;
    };
    workerIndex: number;
    parallelIndex: number;
    attachments: Array<{
        name: string;
        contentType: string;
    }>;
    annotations?: Array<Annotation>;
    retry: number;
}
interface TestEndEvent extends BaseEvent {
    type: 'test:end';
    testId: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
    outcome: 'expected' | 'unexpected' | 'flaky' | 'skipped';
    duration: number;
    retry: number;
    workerIndex: number;
    parallelIndex: number;
    annotations: Array<Annotation>;
    errors: Array<{
        message: string;
        stack?: string;
        snippet?: string;
        value?: string;
        location?: {
            file: string;
            line: number;
            column: number;
        };
    }>;
    steps: {
        total: number;
        passed: number;
        failed: number;
    };
    attachments: Array<{
        name: string;
        contentType: string;
        blobKey?: string;
        unavailable?: boolean;
    }>;
    stdout?: string[];
    stderr?: string[];
}
interface TestRunEndEvent extends BaseEvent {
    type: 'run:end';
    status: 'passed' | 'failed' | 'timedout' | 'interrupted';
    duration: number;
    startTime: number;
    shard?: {
        current: number;
        total: number;
    };
    splitId?: string;
    orchestrationId?: string;
    split?: {
        current: number;
        total: number;
    };
    coverageExpected?: boolean;
}
interface RunHeartbeatEvent {
    type: 'run:heartbeat';
    runId: string;
    timestamp: number;
}
interface CoverageDataEvent extends BaseEvent {
    type: 'coverage:data';
    summary: CoverageSummary;
    files: FileCoverage[];
    compactCounts?: CompactCoverageData;
    metadata: {
        instrumentationType: 'istanbul';
        fileCount: number;
        sharded: boolean;
    };
    shard?: {
        current: number;
        total: number;
    };
    splitId?: string;
    split?: {
        current: number;
        total: number;
    };
}
interface CompressedCoverageDataEvent {
    type: 'coverage:data';
    runId: string;
    timestamp: number;
    sequence: number;
    compression: 'gzip';
    payload: string;
}
interface TestRunErrorEvent extends BaseEvent {
    type: 'run:error';
    error: {
        message?: string;
        stack?: string;
        value?: string;
        snippet?: string;
        location?: {
            file: string;
            line: number;
            column: number;
        };
        cause?: {
            message?: string;
            stack?: string;
            value?: string;
            snippet?: string;
            location?: {
                file: string;
                line: number;
                column: number;
            };
        };
    };
}
interface TestConsoleOutEvent extends BaseEvent {
    type: 'console:out';
    text: string;
    testId?: string;
    retry?: number;
    truncated?: boolean;
}
interface TestConsoleErrEvent extends BaseEvent {
    type: 'console:err';
    text: string;
    testId?: string;
    retry?: number;
    truncated?: boolean;
}

declare class TestdinoReporter implements Reporter {
    private config;
    private buffer;
    private runId;
    private sequenceNumber;
    private shardInfo?;
    private splitInfo?;
    private splitId?;
    private orchestrationId?;
    private injectedRunId?;
    private deviceId?;
    private runStartTime?;
    private sigintHandler?;
    private sigtermHandler?;
    private isShuttingDown;
    private shutdownResolve;
    private shutdownPromise;
    private deliveryFailureCount;
    private quotaExceeded;
    private pendingQuotaError;
    private httpClient;
    private runUrlPromise;
    private resolvedRunUrl;
    private projectId;
    private kafkaProducer;
    private deliveryManager;
    private artifactUploadClient;
    private artifactsEnabled;
    private initPromise;
    private initFailed;
    private pendingTestEndPromises;
    private openAttempts;
    private openAttemptsFinalized;
    private updateCheckPromise;
    private artifactCounts;
    private log;
    private coverageEnabled;
    private coverageMerger;
    private warnedCoverageDisconnect;
    private coverageThresholdFailures;
    private testCounts;
    private totalTests;
    private executedTests;
    private lastCoverageEvent;
    private summaryPrinted;
    private heartbeatTimer;
    private projectNames;
    private runMetadata;
    private rootDir;
    private workerCount;
    constructor(config?: TestdinoConfig);
    private loadCliConfig;
    private splitFields;
    private orchFields;
    onBegin(config: FullConfig, suite: Suite): Promise<void>;
    private performAsyncInit;
    onTestBegin(test: TestCase, result: TestResult): Promise<void>;
    private attemptKey;
    private finalizeOpenAttemptsAsInterrupted;
    onStepBegin(test: TestCase, result: TestResult, step: TestStep): Promise<void>;
    onStepEnd(test: TestCase, result: TestResult, step: TestStep): Promise<void>;
    onTestEnd(test: TestCase, result: TestResult): void;
    private waitForShutdown;
    private processTestEnd;
    onEnd(result: FullResult): Promise<{
        status?: FullResult['status'];
    } | void>;
    private printDeliveryDiscardBanner;
    onError(error: TestError): Promise<void>;
    onStdOut(chunk: string | Buffer, test?: TestCase, result?: TestResult): Promise<void>;
    onStdErr(chunk: string | Buffer, test?: TestCase, result?: TestResult): Promise<void>;
    printsToStdio(): boolean;
    private sendEvents;
    private getToken;
    private getBaseServerUrl;
    private printConfigurationError;
    private collectMetadata;
    private normalizeFilePath;
    private getEventMetadata;
    private extractAnnotations;
    private extractParentSuite;
    private extractParentStep;
    private extractChildSteps;
    private extractError;
    private extractGlobalError;
    private printQuotaError;
    private truncateChunk;
    private extractAttachments;
    private extractTestStepsSummary;
    private extractConsoleOutput;
    private isDuplicateInstance;
    private countTestdinoReporters;
    private isTestdinoReporter;
    private startHeartbeatMonitor;
    private stopHeartbeatMonitor;
    private registerSignalHandlers;
    private resolveRunUrl;
    private sliceScopedUrl;
    private printUpdateNoticeIfAvailable;
    private removeSignalHandlers;
    private handleInterruption;
    private sendInterruptionEvent;
    private timeoutPromise;
    private tallyArtifacts;
    private attachmentsAsUnavailable;
    private uploadAttachments;
    private statAttachments;
    private filterUploadable;
    private putBatch;
    private snapshotAttachments;
    private getProjectName;
    private extractCoverageFromResult;
    private buildCoverageEvent;
    private maybeCompressCoverageEvent;
    private checkCoverageThresholds;
}

export { type Annotation, type BaseEvent, type CIMetadata, type CompactCoverageData, type CompactFileCounts, type CompressedCoverageDataEvent, type CoverageConfig, type CoverageDataEvent, type CoverageFragment, type CoverageMetric, type CoverageSummary, type CoverageThresholds, DEFAULT_SERVER_URL, type FileCoverage, type GitMetadata, type IstanbulCoverageMap, type MetadataCollectionResult, type MetadataCollectionSummary, type MetadataCollector, type NackMessage, type PRMetadata, type PlaywrightMetadata, QuotaExceededError, QuotaExhaustedError, type RunHeartbeatEvent, type CompleteMetadata as RunMetadata, type ServerError, type SessionCreationQuotaResponse, type ShardMetadata, type SystemMetadata, type TestBeginEvent, type TestConsoleErrEvent, type TestConsoleOutEvent, type TestEndEvent, type TestEvent, type TestRunBeginEvent, type TestRunEndEvent, type TestRunErrorEvent, type TestStepBeginEvent, type TestStepEndEvent, type TestdinoConfig, coverageFixtures, TestdinoReporter as default, test };
