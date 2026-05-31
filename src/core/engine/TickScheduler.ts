interface ScheduledTask {
  interval: number; // ticks
  offset: number;
  callback: (tick: number) => void;
}

export class TickScheduler {
  private tasks: ScheduledTask[] = [];

  schedule(interval: number, callback: (tick: number) => void, offset: number = 0) {
    this.tasks.push({ interval, callback, offset });
  }

  tick(currentTick: number) {
    for (const task of this.tasks) {
      if ((currentTick + task.offset) % task.interval === 0) {
        task.callback(currentTick);
      }
    }
  }
}
