/**
 * Mapeia um número de processo no padrão CNJ (20 dígitos) para o alias do
 * tribunal usado nos índices públicos do DataJud, ou `null` quando não há
 * cobertura (número inválido, segmento não suportado ou TR fora da faixa).
 *
 * O número CNJ é `NNNNNNN-DD.AAAA.J.TR.OOOO`. Na string de 20 dígitos (sem
 * pontuação), J fica no índice 13 e TR nos índices 14-15 (base 0):
 *
 *   seq(0-6) · DD(7-8) · ano(9-12) · J(13) · TR(14-15) · origem(16-19)
 *
 * J identifica o segmento da Justiça; TR, o tribunal dentro do segmento.
 */

// Unidades da federação na ordem oficial do CNJ (TR 1..27). O índice 7 (DF)
// é "dft" de propósito: na Justiça Estadual o alias vira "tjdft" e na
// Eleitoral "tre-dft". O índice 0 não corresponde a UF alguma.
const UF_BY_TR = [
    '',
    'ac',
    'al',
    'ap',
    'am',
    'ba',
    'ce',
    'dft',
    'es',
    'go',
    'ma',
    'mt',
    'ms',
    'mg',
    'pa',
    'pb',
    'pr',
    'pe',
    'pi',
    'rj',
    'rn',
    'rs',
    'ro',
    'rr',
    'sc',
    'se',
    'sp',
    'to',
];

// Justiça Militar Estadual (J=9): só MG, RS e SP têm tribunal próprio.
const MILITARY_STATE_BY_TR: Record<number, string> = {
    13: 'tjmmg',
    21: 'tjmrs',
    26: 'tjmsp',
};

/** Remove tudo que não for dígito. Útil tanto aqui quanto no corpo da busca. */
export function onlyDigits(code: string): string {
    return code.replace(/\D/g, '');
}

export function datajudAlias(code: string): string | null {
    const digits = onlyDigits(code);
    if (digits.length !== 20) return null;

    const j = Number(digits[13]);
    const tr = Number(digits.slice(14, 16));

    switch (j) {
        case 3: // STJ — tribunal único, TR irrelevante.
            return 'stj';
        case 4: // Justiça Federal → TRF 1..6
            return tr >= 1 && tr <= 6 ? `trf${tr}` : null;
        case 5: // Justiça do Trabalho → TST (0) / TRT 1..24
            if (tr === 0) return 'tst';
            return tr >= 1 && tr <= 24 ? `trt${tr}` : null;
        case 6: // Justiça Eleitoral → TRE por UF (1..27)
            return tr >= 1 && tr <= 27 ? `tre-${UF_BY_TR[tr]}` : null;
        case 7: // Justiça Militar da União → STM
            return tr === 0 ? 'stm' : null;
        case 8: // Justiça Estadual → TJ por UF (1..27)
            return tr >= 1 && tr <= 27 ? `tj${UF_BY_TR[tr]}` : null;
        case 9: // Justiça Militar Estadual → só MG, RS, SP
            return MILITARY_STATE_BY_TR[tr] ?? null;
        default:
            return null;
    }
}

export function datajudSearchUrl(alias: string): string {
    return `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`;
}
