export default async function globalTeardown(): Promise<void> {
  await globalThis.e2eMongo?.stop();
}
