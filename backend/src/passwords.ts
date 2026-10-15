import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const HASH_BYTES = 64;
const MIN_PASSWORD_LENGTH = 12;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, HASH_BYTES, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scrypt(password, salt);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string
): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expectedHash = Buffer.from(hashHex, "hex");
  if (salt.length !== SALT_BYTES || expectedHash.length !== HASH_BYTES) return false;

  const actualHash = await scrypt(password, salt);
  return timingSafeEqual(actualHash, expectedHash);
}

export function generateTemporaryPassword(): string {
  return randomBytes(24).toString("base64url");
}

export const minimumPasswordLength = MIN_PASSWORD_LENGTH;
