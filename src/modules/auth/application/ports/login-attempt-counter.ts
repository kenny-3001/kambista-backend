export interface LoginAttemptWindow {
  /** Attempts counted in the current window, including this one. */
  count: number;
  /** When the window ends and the count starts again from zero. */
  resetsAt: Date;
}

/**
 * Counts login attempts per key (email + client IP) in fixed time windows.
 * Implementations must increment atomically, so concurrent attempts can
 * never slip past the limit.
 */
export abstract class LoginAttemptCounter {
  /** Adds one attempt; opens a new window if there is none or it ended. */
  abstract increment(
    key: string,
    now: Date,
    windowMs: number,
  ): Promise<LoginAttemptWindow>;

  /** Forgets the attempts of the key (after a successful login). */
  abstract reset(key: string): Promise<void>;
}
