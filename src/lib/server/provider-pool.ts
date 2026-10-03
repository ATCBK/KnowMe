import type { ChatConfig, ProviderConfig } from "./config";
import { HttpError } from "./errors";

type ProviderState = { config: ProviderConfig; active: number; cooldownUntil: number };
export type Lease = { provider: ProviderConfig; release: (failed?: boolean) => void };
type Waiting = { resolve: (lease: Lease) => void; reject: (error: unknown) => void; signal: AbortSignal; cleanup: () => void };

/** A bounded FIFO queue and round-robin scheduler for a single persistent Node process. */
export class ProviderPool {
  private providers: ProviderState[];
  private queue: Waiting[] = [];
  private active = 0;
  private cursor = 0;
  private wakeTimer?: ReturnType<typeof setTimeout>;
  constructor(private config: Pick<ChatConfig, "providers" | "concurrency" | "queueSize" | "queueTimeoutMs" | "cooldownMs">) {
    this.providers = config.providers.map((entry) => ({ config: entry, active: 0, cooldownUntil: 0 }));
  }

  private take(): Lease | undefined {
    if (this.active >= this.config.concurrency) return;
    for (let offset = 0; offset < this.providers.length; offset++) {
      const index = (this.cursor + offset) % this.providers.length;
      const state = this.providers[index];
      if (state.active >= state.config.concurrency || state.cooldownUntil > Date.now()) continue;
      this.cursor = (index + 1) % this.providers.length;
      state.active++;
      this.active++;
      let released = false;
      return { provider: state.config, release: (failed = false) => {
        if (released) return;
        released = true;
        state.active--;
        this.active--;
        if (failed) state.cooldownUntil = Date.now() + this.config.cooldownMs;
        this.drain();
      } };
    }
  }

  private drain() {
    if (this.wakeTimer) clearTimeout(this.wakeTimer);
    this.wakeTimer = undefined;
    while (this.queue.length) {
      const waiting = this.queue[0];
      if (waiting.signal.aborted) {
        this.queue.shift();
        waiting.cleanup();
        waiting.reject(waiting.signal.reason);
        continue;
      }
      const lease = this.take();
      if (!lease) break;
      this.queue.shift();
      waiting.cleanup();
      waiting.resolve(lease);
    }
    if (this.queue.length) {
      const next = Math.min(...this.providers.filter((entry) => entry.cooldownUntil > Date.now()).map((entry) => entry.cooldownUntil));
      if (Number.isFinite(next)) this.wakeTimer = setTimeout(() => this.drain(), Math.max(1, next - Date.now()));
    }
  }

  acquire(signal: AbortSignal): Promise<Lease> {
    signal.throwIfAborted();
    if (!this.providers.length) return Promise.reject(new HttpError(503, "AGENT_NOT_CONFIGURED", "智能体暂未配置。"));
    this.drain();
    if (!this.queue.length) {
      const lease = this.take();
      if (lease) return Promise.resolve(lease);
    }
    if (this.queue.length >= this.config.queueSize) return Promise.reject(new HttpError(503, "QUEUE_FULL", "当前提问较多，请稍后再试。", 5));
    return new Promise((resolve, reject) => {
      const remove = (error: unknown) => {
        const index = this.queue.indexOf(waiting);
        if (index < 0) return;
        this.queue.splice(index, 1);
        waiting.cleanup();
        reject(error);
        this.drain();
      };
      const abort = () => remove(signal.reason);
      const timer = setTimeout(() => remove(new HttpError(503, "QUEUE_TIMEOUT", "等待回复超时，请稍后再试。", 5)), this.config.queueTimeoutMs);
      const waiting: Waiting = { resolve, reject, signal, cleanup: () => { clearTimeout(timer); signal.removeEventListener("abort", abort); } };
      this.queue.push(waiting);
      signal.addEventListener("abort", abort, { once: true });
      this.drain();
    });
  }
}
