import { User } from '../domain/user';

/** Public representation of a user. Never includes the password hash. */
export interface UserResponse {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    nombre: user.name,
    email: user.email.value,
    rol: user.role,
  };
}
