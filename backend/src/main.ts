import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Origem(ns) do front via env (lista separada por vírgula). Sem CORS_ORIGIN,
    // libera geral — em dev tudo passa pelo proxy do Vite, mesma origem.
    const corsOrigin = process.env.CORS_ORIGIN;
    app.enableCors({
        origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.useGlobalFilters(new PrismaExceptionFilter());

    const swaggerConfig = new DocumentBuilder()
        .setTitle('ERP Jurídico API')
        .setDescription('API do sistema ERP para escritórios de advocacia')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
