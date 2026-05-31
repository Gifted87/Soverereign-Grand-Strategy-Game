type EventHandler = (payload: any) => void;

export class EventBus {
  private listeners: Record<string, EventHandler[]> = {};

  subscribe(event: string, callback: EventHandler): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.unsubscribe(event, callback);
  }

  unsubscribe(event: string, callback: EventHandler): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  publish(event: string, payload?: any): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(payload));
  }
}
