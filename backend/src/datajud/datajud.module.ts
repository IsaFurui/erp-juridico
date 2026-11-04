import { Module } from '@nestjs/common';
import { DatajudProvider } from './datajud.provider';
import { TRIBUNAL_PROVIDER } from './tribunal-provider';

/**
 * Integração com o DataJud (API pública do CNJ). Expõe o `TribunalProvider`
 * pelo token — quem consome (job de sync, endpoint sob demanda) depende da
 * interface, não da implementação. `ConfigService` já é global (AppModule).
 */
@Module({
    providers: [{ provide: TRIBUNAL_PROVIDER, useClass: DatajudProvider }],
    exports: [TRIBUNAL_PROVIDER],
})
export class DatajudModule {}
