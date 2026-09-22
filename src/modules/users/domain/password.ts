import {
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;

const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function deriveKey(
  password: string,
  salt: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(
  password: string,
): Promise<string> {
  if (password.length < 12 || password.length > 128) {
    throw new Error(
      "La contraseña debe tener entre 12 y 128 caracteres.",
    );
  }

  const salt = randomBytes(16).toString("hex");
  const hash = await deriveKey(password, salt);

  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (password.length === 0 || password.length > 128) {
    return false;
  }

  const match =
    /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(
      storedHash,
    );

  if (!match) {
    return false;
  }

  try {
    const actualHash = await deriveKey(
      password,
      match[1],
    );

    const expectedHash = Buffer.from(
      match[2],
      "hex",
    );

    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}