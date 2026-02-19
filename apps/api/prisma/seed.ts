import { PrismaClient } from '@prisma/client';
import { createCipheriv, createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function encryptEntry(
  key: Buffer,
  data: { date: string; title: string; description: string },
): string {
  const plaintext = Buffer.from(JSON.stringify(data), 'utf-8');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

const SAMPLE_ENTRIES = [
  {
    date: '2025-02-16',
    title: 'El primer paso',
    description: 'El viaje de mil millas comienza con un solo paso. Hoy decidí empezar.',
    timestamp: Math.floor(new Date('2025-02-16T10:00:00').getTime() / 1000),
  },
  {
    date: '2025-02-15',
    title: 'Gratitud',
    description:
      'Estoy agradecido por las pequeñas cosas: el café de la mañana, el sol que entra por la ventana, y tener un lugar donde escribir esto.',
    timestamp: Math.floor(new Date('2025-02-15T08:30:00').getTime() / 1000),
  },
  {
    date: '2025-02-14',
    title: 'Reflexión nocturna',
    description:
      'A veces las mejores ideas llegan cuando todo está en silencio. Hoy aprendí que no hay que tener miedo a la quietud.',
    timestamp: Math.floor(new Date('2025-02-14T23:15:00').getTime() / 1000),
  },
  {
    date: '2025-02-13',
    title: 'Un día productivo',
    description:
      'Completé algo que venía postergando. La sensación de cerrar ciclos es incomparable.',
    timestamp: Math.floor(new Date('2025-02-13T18:00:00').getTime() / 1000),
  },
  {
    date: '2025-02-12',
    title: 'Cita del día',
    description:
      '"La única manera de hacer un gran trabajo es amar lo que haces." — Steve Jobs. Algo para recordar.',
    timestamp: Math.floor(new Date('2025-02-12T12:00:00').getTime() / 1000),
  },
  {
    date: '2025-02-11',
    title: 'Persistencia',
    description:
      'No es la caída lo que define el fracaso, sino quedarse en el suelo. Hoy me levanté y seguí.',
    timestamp: Math.floor(new Date('2025-02-11T09:00:00').getTime() / 1000),
  },
  {
    date: '2025-02-10',
    title: 'Desconexión',
    description:
      'Pasé la tarde sin mirar el teléfono. El mundo no se cayó. Yo sí me sentí más presente.',
    timestamp: Math.floor(new Date('2025-02-10T20:00:00').getTime() / 1000),
  },
  {
    date: '2025-02-09',
    title: 'Aprendizaje',
    description:
      'Cometí un error y en lugar de castigarme, me pregunté: ¿qué puedo aprender de esto?',
    timestamp: Math.floor(new Date('2025-02-09T14:30:00').getTime() / 1000),
  },
  {
    date: '2025-02-08',
    title: 'Conversación',
    description:
      'Una charla de cinco minutos con un amigo puede cambiar el rumbo del día. Hoy lo viví.',
    timestamp: Math.floor(new Date('2025-02-08T16:45:00').getTime() / 1000),
  },
  {
    date: '2025-02-07',
    title: 'Rutina',
    description:
      'La rutina no tiene que ser aburrida. Puede ser el andamiaje que sostiene la creatividad.',
    timestamp: Math.floor(new Date('2025-02-07T07:15:00').getTime() / 1000),
  },
  {
    date: '2025-02-06',
    title: 'Duda',
    description:
      '"La duda es el principio de la sabiduría." — Aristóteles. Hoy dudé, y eso me llevó a preguntar mejor.',
    timestamp: Math.floor(new Date('2025-02-06T11:00:00').getTime() / 1000),
  },
  {
    date: '2025-02-05',
    title: 'Pequeña victoria',
    description:
      'Terminé algo que llevaba semanas en la lista. No era urgente, pero era importante. Me siento liviano.',
    timestamp: Math.floor(new Date('2025-02-05T17:30:00').getTime() / 1000),
  },
  {
    date: '2025-02-04',
    title: 'Claridad',
    description:
      'Después de escribir esto, las ideas se ordenaron. El acto de poner palabras a los pensamientos los transforma.',
    timestamp: Math.floor(new Date('2025-02-04T21:00:00').getTime() / 1000),
  },
  {
    date: '2025-02-03',
    title: 'Generosidad',
    description: 'Alguien me ayudó sin que se lo pidiera. Mañana quiero ser esa persona para otro.',
    timestamp: Math.floor(new Date('2025-02-03T13:20:00').getTime() / 1000),
  },
  {
    date: '2025-02-02',
    title: 'Principio',
    description:
      'Este journal es el principio de algo. No sé exactamente qué, pero sé que quiero seguir escribiendo.',
    timestamp: Math.floor(new Date('2025-02-02T08:00:00').getTime() / 1000),
  },
];

async function main() {
  const encryptionKey = process.env.JOURNAL_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.log('JOURNAL_ENCRYPTION_KEY not set. Skipping seed.');
    return;
  }
  const key = createHash('sha256').update(encryptionKey).digest();

  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.log('No hay usuarios en la base de datos. Hacé login primero para crear uno.');
    return;
  }

  for (const user of users) {
    const existingCount = await prisma.journalEntry.count({
      where: { userId: user.id },
    });
    if (existingCount > 0) {
      console.log(`⊘ User ${user.email} ya tiene ${existingCount} entradas. Saltando.`);
      continue;
    }

    for (const entry of SAMPLE_ENTRIES) {
      const ciphertext = encryptEntry(key, {
        date: entry.date,
        title: entry.title,
        description: entry.description,
      });
      await prisma.journalEntry.create({
        data: {
          userId: user.id,
          ciphertext,
          timestamp: entry.timestamp,
        },
      });
    }
    console.log(`✓ Creadas ${SAMPLE_ENTRIES.length} citas para ${user.email}`);
  }

  console.log('\nSeed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
