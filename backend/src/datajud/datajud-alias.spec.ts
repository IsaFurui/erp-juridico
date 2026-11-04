import { datajudAlias, datajudSearchUrl, onlyDigits } from './datajud-alias';

describe('datajudAlias', () => {
    it('resolve os exemplos obrigatórios do CNJ', () => {
        // Justiça Federal da 1ª Região (J=4, TR=01).
        expect(datajudAlias('0000832-35.2018.4.01.3202')).toBe('trf1');
        // Justiça Estadual de SP (J=8, TR=26).
        expect(datajudAlias('1016649-39.2025.8.26.0554')).toBe('tjsp');
    });

    it('ignora a pontuação (aceita número formatado ou cru)', () => {
        expect(datajudAlias('00008323520184013202')).toBe('trf1');
        expect(datajudAlias('  1016649-39.2025.8.26.0554  ')).toBe('tjsp');
    });

    it('devolve null para número que não tem 20 dígitos', () => {
        expect(datajudAlias('')).toBeNull();
        expect(datajudAlias('123')).toBeNull();
        expect(datajudAlias('1016649-39.2025.8.26.055')).toBeNull(); // 19
        expect(datajudAlias('100166493920258260554')).toBeNull(); // 21
    });

    it('STJ (J=3) independe do TR', () => {
        expect(datajudAlias('0000001-02.2020.3.00.0000')).toBe('stj');
        expect(datajudAlias('0000001-02.2020.3.15.0000')).toBe('stj');
    });

    it('Justiça Federal (J=4) só cobre TRF 1..6', () => {
        expect(datajudAlias('0000001-02.2020.4.05.0000')).toBe('trf5');
        expect(datajudAlias('0000001-02.2020.4.00.0000')).toBeNull();
        expect(datajudAlias('0000001-02.2020.4.07.0000')).toBeNull();
    });

    it('Justiça do Trabalho (J=5): TST no TR 0, TRT de 1..24', () => {
        expect(datajudAlias('0000001-02.2020.5.00.0000')).toBe('tst');
        expect(datajudAlias('0000001-02.2020.5.02.0000')).toBe('trt2');
        expect(datajudAlias('0000001-02.2020.5.24.0000')).toBe('trt24');
        expect(datajudAlias('0000001-02.2020.5.25.0000')).toBeNull();
    });

    it('Justiça Militar da União (J=7): STM só no TR 0', () => {
        expect(datajudAlias('0000001-02.2020.7.00.0000')).toBe('stm');
        expect(datajudAlias('0000001-02.2020.7.01.0000')).toBeNull();
    });

    it('Justiça Eleitoral (J=6) e Estadual (J=8) tratam o DF como "dft"', () => {
        // DF é o TR 07 na ordem oficial.
        expect(datajudAlias('0000001-02.2020.6.07.0000')).toBe('tre-dft');
        expect(datajudAlias('0000001-02.2020.8.07.0000')).toBe('tjdft');
        // E as pontas da faixa de UF.
        expect(datajudAlias('0000001-02.2020.8.01.0000')).toBe('tjac');
        expect(datajudAlias('0000001-02.2020.8.27.0000')).toBe('tjto');
        expect(datajudAlias('0000001-02.2020.6.19.0000')).toBe('tre-rj');
        expect(datajudAlias('0000001-02.2020.8.28.0000')).toBeNull();
    });

    it('Justiça Militar Estadual (J=9): só MG, RS e SP', () => {
        expect(datajudAlias('0000001-02.2020.9.13.0000')).toBe('tjmmg');
        expect(datajudAlias('0000001-02.2020.9.21.0000')).toBe('tjmrs');
        expect(datajudAlias('0000001-02.2020.9.26.0000')).toBe('tjmsp');
        expect(datajudAlias('0000001-02.2020.9.08.0000')).toBeNull();
    });

    it('segmentos não suportados (ex.: J=1 STF, J=2 CNJ) viram null', () => {
        expect(datajudAlias('0000001-02.2020.1.00.0000')).toBeNull();
        expect(datajudAlias('0000001-02.2020.2.00.0000')).toBeNull();
    });
});

describe('onlyDigits / datajudSearchUrl', () => {
    it('onlyDigits tira qualquer caractere que não seja dígito', () => {
        expect(onlyDigits('1016649-39.2025.8.26.0554')).toBe(
            '10166493920258260554',
        );
    });

    it('datajudSearchUrl monta o índice público do alias', () => {
        expect(datajudSearchUrl('tjsp')).toBe(
            'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search',
        );
    });
});
