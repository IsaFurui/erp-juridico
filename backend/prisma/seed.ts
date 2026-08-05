import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

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
        await prisma.processStatus.upsert({
            where: { description },
            update: {},
            create: { description },
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
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
