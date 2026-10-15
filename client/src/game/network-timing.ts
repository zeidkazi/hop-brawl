import { NETWORK } from '../../../shared/config';
/** Inter-arrival variation minus server cadence, independent of clock offset and tick frequency. */
export class NetworkTiming {
  jitter = 0; ping = 0; private received = 0; private sent = 0;
  get delay(): number { return Math.max(NETWORK.MIN_MS, Math.min(NETWORK.MAX_MS, NETWORK.BASE_MS + 2 * this.jitter)); }
  reset(): void { this.jitter = this.received = this.sent = 0; }
  sample(received: number, sent: number): void {
    if (this.received && sent > this.sent) {
      const variation = Math.abs(received - this.received - (sent - this.sent));
      this.jitter += (variation - this.jitter) * NETWORK.JITTER_ALPHA;
    }
    this.received = received; this.sent = sent;
  }
}
