import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
    let service: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PrismaService,
                {
                    // O service lê DATABASE_URL com getOrThrow no construtor;
                    // o teste não abre conexão, só monta o provider.
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: () =>
                            'postgresql://user:pass@localhost:5432/test',
                    },
                },
            ],
        }).compile();

        service = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
