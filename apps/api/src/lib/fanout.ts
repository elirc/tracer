import { EventEmitter } from "node:events";
import type { MutationDelta } from "@tracer/shared";

type Listener = (workspaceId: string, delta: MutationDelta) => void;

export interface Fanout {
  publish: (workspaceId: string, delta: MutationDelta) => void;
  subscribe: (listener: Listener) => () => void;
}

/**
 * In-process fanout — correct and complete for a SINGLE api instance. Multiple instances need a
 * shared bus so a mutation on instance A reaches a client connected to instance B: that's Redis
 * pub/sub, a drop-in implementation of this same `Fanout` interface (ADR-0006). The interface is
 * the teaching point — swapping the transport touches zero call sites.
 */
class InProcessFanout implements Fanout {
  private emitter = new EventEmitter();
  constructor() {
    this.emitter.setMaxListeners(10_000); // one listener per connected socket
  }
  publish(workspaceId: string, delta: MutationDelta): void {
    this.emitter.emit("delta", workspaceId, delta);
  }
  subscribe(listener: Listener): () => void {
    this.emitter.on("delta", listener);
    return () => this.emitter.off("delta", listener);
  }
}

export const fanout: Fanout = new InProcessFanout();
