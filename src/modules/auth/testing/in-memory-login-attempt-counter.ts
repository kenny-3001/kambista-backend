import {
  LoginAttemptCounter,
  LoginAttemptWindow,
} from '../application/ports/login-attempt-counter';

export class InMemoryLoginAttemptCounter extends LoginAttemptCounter {
  readonly windows = new Map<string, LoginAttemptWindow>();

  increment(
    key: string,
    now: Date,
    windowMs: number,
  ): Promise<LoginAttemptWindow> {
    const current = this.windows.get(key);
    const next =
      current && current.resetsAt > now
        ? { ...current, count: current.count + 1 }
        : { count: 1, resetsAt: new Date(now.getTime() + windowMs) };
    this.windows.set(key, next);
    return Promise.resolve(next);
  }

  reset(key: string): Promise<void> {
    this.windows.delete(key);
    return Promise.resolve();
  }
}
