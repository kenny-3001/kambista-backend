export abstract class PasswordHasher {
  abstract hash(plainPassword: string): Promise<string>;
  abstract compare(plainPassword: string, hash: string): Promise<boolean>;
}
