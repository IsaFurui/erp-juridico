import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

const SALT_ROUNDS = 12;

// Bootstrap do dono da plataforma. É o único caminho para criar um root: a
// API não cria nem promove ninguém a PlatformAdmin. Sem PLATFORM_ADMIN_PASSWORD
// o seed só popula os catálogos.
const PLATFORM_ADMIN = {
    name: process.env.PLATFORM_ADMIN_NAME ?? 'Administrador da Plataforma',
    login: process.env.PLATFORM_ADMIN_LOGIN ?? 'root',
    password: process.env.PLATFORM_ADMIN_PASSWORD,
};

const PROCESS_STATUSES = [
    'Em andamento',
    'Aguardando audiência',
    'Aguardando prazo',
    'Aguardando documento',
    'Aguardando decisão judicial',
    'Em recurso',
    'Suspenso',
    'Sobrestado',
    'Encerrado com êxito',
    'Encerrado sem êxito',
    'Acordo celebrado',
    'Arquivado',
    'Prescrito',
];

// Status que representam o fim do processo. Só nesses o Total destrava para
// edição manual (o advogado acerta o valor que realmente entrou).
const FINAL_STATUSES = new Set([
    'Encerrado com êxito',
    'Encerrado sem êxito',
    'Acordo celebrado',
    'Arquivado',
    'Prescrito',
]);

const PROCESS_TYPES = [
    'Cível',
    'Trabalhista',
    'Criminal',
    'Tributário',
    'Previdenciário',
    'Administrativo',
    'Família e Sucessões',
    'Empresarial',
    'Ambiental',
    'Consumidor',
];

async function main() {
    for (const description of PROCESS_STATUSES) {
        const isFinal = FINAL_STATUSES.has(description);
        await prisma.processStatus.upsert({
            where: { description },
            update: { isFinal },
            create: { description, isFinal },
        });
    }
    console.log(`${PROCESS_STATUSES.length} status cadastrados.`);

    for (const name of PROCESS_TYPES) {
        await prisma.processType.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log(`${PROCESS_TYPES.length} tipos de processo cadastrados.`);

    await seedPlatformAdmin();
}

async function seedPlatformAdmin() {
    if (!PLATFORM_ADMIN.password) {
        console.log(
            'PLATFORM_ADMIN_PASSWORD não definida — pulando o administrador da plataforma.',
        );
        return;
    }

    const existing = await prisma.platformAdmin.findUnique({
        where: { login: PLATFORM_ADMIN.login },
    });

    if (existing) {
        // Reaplica a senha do .env: é também o caminho de recuperação, já que
        // ninguém consegue repor o root pela API.
        await prisma.platformAdmin.update({
            where: { id: existing.id },
            data: {
                passwordHash: await bcrypt.hash(
                    PLATFORM_ADMIN.password,
                    SALT_ROUNDS,
                ),
                active: true,
            },
        });
        console.log(
            `Administrador da plataforma "${PLATFORM_ADMIN.login}" já existia — senha redefinida pelo .env.`,
        );
        return;
    }

    await prisma.platformAdmin.create({
        data: {
            name: PLATFORM_ADMIN.name,
            login: PLATFORM_ADMIN.login,
            passwordHash: await bcrypt.hash(
                PLATFORM_ADMIN.password,
                SALT_ROUNDS,
            ),
        },
    });

    console.log(
        `Administrador da plataforma "${PLATFORM_ADMIN.login}" criado. Entre por POST /auth/platform/login (sem empresa).`,
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
