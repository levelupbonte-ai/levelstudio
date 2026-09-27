import { GoogleGenAI } from "@google/genai";

export interface KeySlot {
  key: string;
  masked: string;
  cooldownUntil: number;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastUsedAt: number;
  isInvalid: boolean;
}

export interface KeyRotationStats {
  totalKeys: number;
  availableKeys: number;
  inCooldownKeys: number;
  invalidKeys: number;
  currentIndex: number;
  keys: Array<{
    masked: string;
    inCooldown: boolean;
    isInvalid: boolean;
    remainingCooldownMs: number;
    totalCalls: number;
    successCount: number;
    failureCount: number;
  }>;
}

/**
 * Service utility that manages an array of Gemini API keys with intelligent round-robin
 * rotation, rate-limit cooldown penalties, placeholder detection, failure tracking, and seamless retries.
 */
export class GeminiKeyRotator {
  private slots: KeySlot[] = [];
  private pointer: number = 0;
  private readonly defaultCooldownMs: number;
  private readonly rateLimitCooldownMs: number;

  constructor(options?: { defaultCooldownMs?: number; rateLimitCooldownMs?: number }) {
    this.defaultCooldownMs = options?.defaultCooldownMs ?? 15_000; // 15s for transient failures
    this.rateLimitCooldownMs = options?.rateLimitCooldownMs ?? 60_000; // 60s for 429/quota limits
    this.refreshKeys();
  }

  /**
   * Identifies dummy placeholder tokens commonly set by accident in .env or dashboard settings.
   */
  public isPlaceholderKey(k: string): boolean {
    const raw = k.trim();
    const lower = raw.toLowerCase();
    if (!lower || lower.length < 15) return true;

    // Reject obvious placeholders
    if (
      lower.startsWith("my_") ||
      lower.startsWith("your_") ||
      lower.startsWith("example_") ||
      lower.startsWith("test_") ||
      lower.startsWith("key_") ||
      lower.startsWith("<") ||
      lower.endsWith(">") ||
      lower.includes("placeholder") ||
      lower.includes("dummy") ||
      lower === "gemini_api_key" ||
      lower === "gemini_api_keys"
    ) {
      return true;
    }

    return false;
  }

  /**
   * Refreshes the pool of API keys from environment variables.
   * Parses JSON arrays, comma/semicolon/newline-delimited strings from GEMINI_API_KEYS,
   * merges with GEMINI_API_KEY, and discards dummy/placeholder tokens.
   */
  public refreshKeys(): void {
    const rawCandidates: string[] = [];

    // 1. Check GEMINI_API_KEYS (array or delimited string)
    if (process.env.GEMINI_API_KEYS) {
      const trimmed = process.env.GEMINI_API_KEYS.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (typeof item === "string") rawCandidates.push(item);
            }
          }
        } catch {
          rawCandidates.push(...trimmed.split(/[\r\n,;]+/));
        }
      } else {
        rawCandidates.push(...trimmed.split(/[\r\n,;]+/));
      }
    }

    // 2. Check standard GEMINI_API_KEY
    if (process.env.GEMINI_API_KEY) {
      rawCandidates.push(process.env.GEMINI_API_KEY);
    }

    // 3. Normalize, deduplicate, and filter out placeholders
    const validCandidates = Array.from(
      new Set(
        rawCandidates
          .map((k) => k.trim())
          .filter((k) => !this.isPlaceholderKey(k)),
      ),
    );

    // Merge into existing slots without losing metrics
    for (const key of validCandidates) {
      if (!this.slots.some((slot) => slot.key === key)) {
        this.slots.push({
          key,
          masked: this.maskKey(key),
          cooldownUntil: 0,
          totalCalls: 0,
          successCount: 0,
          failureCount: 0,
          consecutiveFailures: 0,
          lastUsedAt: 0,
          isInvalid: false,
        });
      }
    }

    // Remove slots no longer present in candidates
    if (validCandidates.length > 0) {
      this.slots = this.slots.filter((slot) => validCandidates.includes(slot.key));
    }
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return "••••";
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  public getKeyCount(): number {
    this.refreshKeys();
    return this.slots.filter((s) => !s.isInvalid).length;
  }

  /**
   * Returns the next available key using round-robin rotation, skipping invalid slots
   * and slots currently in cooldown.
   */
  public getNextKey(): {
    key: string;
    masked: string;
    markSuccess: () => void;
    markFailure: (isRateLimit?: boolean, isInvalid?: boolean) => void;
  } | null {
    this.refreshKeys();
    const activeSlots = this.slots.filter((s) => !s.isInvalid);
    if (activeSlots.length === 0) {
      return null;
    }

    const now = Date.now();
    const len = activeSlots.length;

    // 1. Try to find the next ready key starting from current pointer
    for (let i = 0; i < len; i++) {
      const index = (this.pointer + i) % len;
      const slot = activeSlots[index];

      if (slot.cooldownUntil <= now) {
        this.pointer = (index + 1) % len;
        slot.totalCalls++;
        slot.lastUsedAt = now;

        return {
          key: slot.key,
          masked: slot.masked,
          markSuccess: () => this.handleSuccess(slot),
          markFailure: (isRateLimit = false, isInvalid = false) =>
            this.handleFailure(slot, isRateLimit, isInvalid),
        };
      }
    }

    // 2. All keys in cooldown: pick the one whose cooldown expires earliest
    const sorted = [...activeSlots].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
    const chosen = sorted[0];
    chosen.totalCalls++;
    chosen.lastUsedAt = now;

    return {
      key: chosen.key,
      masked: chosen.masked,
      markSuccess: () => this.handleSuccess(chosen),
      markFailure: (isRateLimit = false, isInvalid = false) =>
        this.handleFailure(chosen, isRateLimit, isInvalid),
    };
  }

  private handleSuccess(slot: KeySlot): void {
    slot.successCount++;
    slot.consecutiveFailures = 0;
    slot.cooldownUntil = 0;
    slot.isInvalid = false;
  }

  private handleFailure(slot: KeySlot, isRateLimit: boolean, isInvalid: boolean): void {
    slot.failureCount++;
    slot.consecutiveFailures++;

    if (isInvalid) {
      slot.isInvalid = true;
      slot.cooldownUntil = Date.now() + 86_400_000; // 24h quarantine
      console.warn(`[GeminiRotator] Key ${slot.masked} returned 400 (API_KEY_INVALID). Disabled.`);
      return;
    }

    const basePenalty = isRateLimit ? this.rateLimitCooldownMs : this.defaultCooldownMs;
    const backoffMultiplier = Math.min(Math.pow(1.5, slot.consecutiveFailures - 1), 5);
    slot.cooldownUntil = Date.now() + Math.round(basePenalty * backoffMultiplier);
  }

  /**
   * Instantiates a new GoogleGenAI client with the required User-Agent header and rotated key.
   */
  public createClient(apiKey: string): GoogleGenAI {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  /**
   * High-level executor that automatically rotates through keys on failure/rate limit,
   * detecting invalid keys, handling 429/quota limits, and falling through seamlessly.
   */
  public async executeWithRotation<T>(
    operation: (ai: GoogleGenAI, apiKey: string) => Promise<T>,
    maxRetries?: number,
  ): Promise<T> {
    const totalKeys = this.getKeyCount();
    const attempts = maxRetries !== undefined ? maxRetries : Math.max(1, Math.min(totalKeys, 5));

    let lastError: unknown = null;

    for (let i = 0; i < attempts; i++) {
      const keyEntry = this.getNextKey();
      if (!keyEntry) {
        throw new Error(
          "No valid Gemini API keys found. Ensure GEMINI_API_KEY is configured with an active Google GenAI key.",
        );
      }

      const client = this.createClient(keyEntry.key);

      try {
        const result = await operation(client, keyEntry.key);
        keyEntry.markSuccess();
        return result;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || "");
        const errStatus = String(err?.status || "");

        const isRateLimit =
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota") ||
          errMsg.includes("Rate limit");

        const isInvalidKey =
          errMsg.includes("API key not valid") ||
          errMsg.includes("API_KEY_INVALID") ||
          errStatus === "INVALID_ARGUMENT";

        console.warn(
          `[GeminiRotator] Attempt ${i + 1}/${attempts} failed using key ${keyEntry.masked} (RateLimit: ${isRateLimit}, Invalid: ${isInvalidKey}): ${errMsg.slice(0, 120)}`,
        );

        keyEntry.markFailure(isRateLimit, isInvalidKey);
      }
    }

    throw lastError || new Error("All rotated Gemini API keys failed.");
  }

  /**
   * Returns current pool health metrics for administration and diagnostics without leaking secrets.
   */
  public getStats(): KeyRotationStats {
    const now = Date.now();
    return {
      totalKeys: this.slots.length,
      availableKeys: this.slots.filter((s) => !s.isInvalid && s.cooldownUntil <= now).length,
      inCooldownKeys: this.slots.filter((s) => !s.isInvalid && s.cooldownUntil > now).length,
      invalidKeys: this.slots.filter((s) => s.isInvalid).length,
      currentIndex: this.pointer,
      keys: this.slots.map((s) => ({
        masked: s.masked,
        inCooldown: s.cooldownUntil > now,
        isInvalid: s.isInvalid,
        remainingCooldownMs: Math.max(0, s.cooldownUntil - now),
        totalCalls: s.totalCalls,
        successCount: s.successCount,
        failureCount: s.failureCount,
      })),
    };
  }
}

// Singleton exported instance
export const geminiRotator = new GeminiKeyRotator();
