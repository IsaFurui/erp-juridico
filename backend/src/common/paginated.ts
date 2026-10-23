import { DEFAULT_PAGE_SIZE } from './dto/pagination-query.dto';

/**
 * Envelope das listagens. É o mesmo formato para todo módulo, porque o
 * frontend tem um componente de paginação só.
 */
export interface Paginated<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    /** Total de páginas; 1 mesmo quando não há nenhum registro. */
    pages: number;
}

/** Normaliza page/pageSize já com os defaults aplicados. */
export function resolvePagination(page?: number, pageSize?: number) {
    const resolvedPage = page ?? 1;
    const resolvedPageSize = pageSize ?? DEFAULT_PAGE_SIZE;
    return {
        page: resolvedPage,
        pageSize: resolvedPageSize,
        skip: (resolvedPage - 1) * resolvedPageSize,
        take: resolvedPageSize,
    };
}

export function buildPaginated<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
): Paginated<T> {
    return {
        items,
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
    };
}
