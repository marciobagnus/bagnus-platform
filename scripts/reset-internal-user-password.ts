import {
  hashPassword,
} from "../src/modules/users/domain/password.ts";

import { prisma } from "../src/lib/prisma.ts";

const username =
  process.env.BAGNUS_USER_USERNAME
    ?.trim()
    .toLowerCase();

const password =
  process.env.BAGNUS_USER_PASSWORD;

if (!username || !password) {
  throw new Error(
    "Faltan BAGNUS_USER_USERNAME o BAGNUS_USER_PASSWORD.",
  );
}

try {
  const existingUser =
    await prisma.internalUser.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

  if (!existingUser) {
    throw new Error(
      `No existe el usuario "${username}".`,
    );
  }

  const passwordHash =
    await hashPassword(password);

  await prisma.internalUser.update({
    where: {
      id: existingUser.id,
    },
    data: {
      passwordHash,
      updatedAt: new Date(),
    },
  });

  // Invalidar sesiones anteriores.
  await prisma.internalSession.deleteMany({
    where: {
      userId: existingUser.id,
    },
  });

  console.log(
    `Contraseña actualizada para ${existingUser.username}.`,
  );
} finally {
  await prisma.$disconnect();
}