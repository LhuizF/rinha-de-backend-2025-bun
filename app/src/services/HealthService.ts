import { fetch } from "undici";
import { ProcessorType } from "../types";

interface ProcessorHealthResponse {
  failing: boolean;
  minResponseTime: number
}

interface Cache {
  default: ProcessorHealthResponse;
  fallback: ProcessorHealthResponse;
}

class HealthService {
  private static instance: HealthService;

  private readonly defaultHealthUrl = `${process.env.PROCESSOR_DEFAULT_URL}/payments/service-health`;
  private readonly fallbackHealthUrl = `${process.env.PROCESSOR_FALLBACK_URL}/payments/service-health`;

  private lastCheck: number = 0;

  private readonly CACHE_DURATION = 5000; // 5 seconds

  private cache: Cache = {
    default: { failing: false, minResponseTime: -1 },
    fallback: { failing: false, minResponseTime: -1 }
  };

  private constructor() {}

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  public async getProcessor(): Promise<ProcessorType> {
    const now = Date.now()

    if (now - this.lastCheck > this.CACHE_DURATION) {
      const [defaultResponse, fallback] = await Promise.all([
        fetch(this.defaultHealthUrl)
          .then((response) => response.json() as Promise<ProcessorHealthResponse>)
          .catch(() => null),
        fetch(this.fallbackHealthUrl)
          .then((response) => response.json() as Promise<ProcessorHealthResponse>)
          .catch(() => null)
      ])

      if (defaultResponse) {
        this.cache.default = defaultResponse
      } else {
        this.cache.default = { failing: true, minResponseTime: Infinity };
      }

      if (fallback) {
        this.cache.fallback = fallback;
      } else {
        this.cache.fallback = { failing: true, minResponseTime: Infinity };
      }

      this.lastCheck = now;
    }

    if (!this.cache.default.failing && (this.cache.default.minResponseTime <= this.cache.fallback.minResponseTime || this.cache.fallback.failing)) {
      return 'default';
    }

    return 'fallback';
  }
}


export const healthService = HealthService.getInstance();
