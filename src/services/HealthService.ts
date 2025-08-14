import type { ProcessorType } from "../types";
import { redisService } from './RedisService'

interface ProcessorHealthResponse {
  failing: boolean;
  minResponseTime: number
  lastCheck: number;
}

interface Cache {
  default: ProcessorHealthResponse;
  fallback: ProcessorHealthResponse;
}

class HealthService {
  private static instance: HealthService;

  private readonly defaultHealthUrl = `${process.env.PROCESSOR_DEFAULT_URL}/payments/service-health`;
  private readonly fallbackHealthUrl = `${process.env.PROCESSOR_FALLBACK_URL}/payments/service-health`;

  private readonly CACHE_DURATION = 5000;

  private cache: Cache = {
    default: { failing: false, minResponseTime: 0, lastCheck: 0 },
    fallback: { failing: false, minResponseTime: 0, lastCheck: 0 }
  };

  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.update()
  }

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  public start() {
    if (this.intervalId) {
      return;
    }

    console.log("[HealthService] Start");
    this.update();
    this.intervalId = setInterval(() => this.update(), this.CACHE_DURATION);
  }

  private async update() {
    await Promise.all([
      this.updateCache("default"),
      this.updateCache("fallback")
    ]);

    this.updateCurrentProcessor();
  }

  private getProcessor(): ProcessorType {
    const def = this.cache.default;
    const fb = this.cache.fallback;
    const maxExtraLatency = 500;

    if (!def.failing) {
      if (
        fb.minResponseTime + maxExtraLatency < def.minResponseTime &&
        !fb.failing
      ) {
        return 'fallback';
      }
      return 'default'
    }

    if (!fb.failing) {
      return 'fallback';
    }

    return 'default';
  }

  private async updateCache(processor: ProcessorType): Promise<void> {
    const now = Date.now();

    if (now - this.cache[processor].lastCheck < this.CACHE_DURATION) {
      return
    }

    const processorUrl = processor === 'default' ? this.defaultHealthUrl : this.fallbackHealthUrl;

    try {
      const res = await fetch(processorUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json() as ProcessorHealthResponse;

      this.cache[processor].failing = data.failing
      this.cache[processor].minResponseTime = data.minResponseTime
      this.cache[processor].lastCheck = now;
      // console.log('[HealthService] Updated cache for', processor, new Date().toISOString());
    } catch (e) {
      this.cache[processor].failing = true;
      this.cache[processor].lastCheck = now;
    }
  }

  private updateCurrentProcessor() {
    const processor = this.getProcessor();
    redisService.setCurrentProcessor(processor);
  }
}


export const healthService = HealthService.getInstance();
