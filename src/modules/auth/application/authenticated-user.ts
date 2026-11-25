import { Role } from '../domain/role';

/** Identity of the caller, as proven by a verified access token. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
