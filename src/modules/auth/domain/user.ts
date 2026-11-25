import { randomUUID } from 'node:crypto';
import { InvalidUserNameError } from './errors/invalid-user-name.error';
import { Role } from './role';
import { Email } from './value-objects/email';

export interface UserProps {
  id: string;
  name: string;
  email: Email;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  /** Creates a brand-new user. Self-registered users always get the `user` role. */
  static register(params: {
    name: string;
    email: Email;
    passwordHash: string;
  }): User {
    const name = params.name.trim();
    if (!name) {
      throw new InvalidUserNameError();
    }

    return new User({
      id: randomUUID(),
      name,
      email: params.email,
      passwordHash: params.passwordHash,
      role: Role.USER,
      createdAt: new Date(),
    });
  }

  /** Rebuilds a user that already exists in persistence. */
  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): Role {
    return this.props.role;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isAdmin(): boolean {
    return this.props.role === Role.ADMIN;
  }

  /** Admins are never self-registered; they are granted from the back office. */
  promoteToAdmin(): void {
    this.props.role = Role.ADMIN;
  }
}
