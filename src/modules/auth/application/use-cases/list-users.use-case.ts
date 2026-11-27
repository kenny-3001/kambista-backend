import { User } from '../../domain/user';
import { UserRepository } from '../../domain/user.repository';

export const USERS_DEFAULT_LIMIT = 20;
export const USERS_MAX_LIMIT = 50;

/**
 * Lists users for the admin's user picker, optionally filtered by a piece
 * of their name or email. Who may call it is decided at the entry point
 * (the controller restricts it to admins).
 */
export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(params: { search?: string; limit?: number } = {}): Promise<User[]> {
    return this.users.search({
      text: params.search?.trim() || undefined,
      limit: Math.min(
        Math.max(params.limit ?? USERS_DEFAULT_LIMIT, 1),
        USERS_MAX_LIMIT,
      ),
    });
  }
}
