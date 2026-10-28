import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

/**
 * Traduz os erros conhecidos do Prisma em respostas HTTP decentes em vez de
 * vazar um 500. Pega os três que o app encosta: violação de unique, violação
 * de FK (ex.: apagar um catálogo em uso) e registro não encontrado.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(PrismaExceptionFilter.name);

    catch(
        exception: Prisma.PrismaClientKnownRequestError,
        host: ArgumentsHost,
    ) {
        const res = host.switchToHttp().getResponse<Response>();

        switch (exception.code) {
            case 'P2002': // unique
                return res.status(HttpStatus.CONFLICT).json({
                    statusCode: HttpStatus.CONFLICT,
                    message: 'Já existe um registro com esse valor.',
                });
            case 'P2003': // foreign key
                return res.status(HttpStatus.CONFLICT).json({
                    statusCode: HttpStatus.CONFLICT,
                    message:
                        'Não é possível concluir: há registros vinculados a este.',
                });
            case 'P2025': // not found
                return res.status(HttpStatus.NOT_FOUND).json({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Registro não encontrado.',
                });
            default:
                // Qualquer outro erro conhecido ainda é inesperado aqui: loga e
                // devolve 500 sem expor o detalhe do banco.
                this.logger.error(
                    `Prisma ${exception.code}: ${exception.message}`,
                );
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Erro interno no servidor.',
                });
        }
    }
}
