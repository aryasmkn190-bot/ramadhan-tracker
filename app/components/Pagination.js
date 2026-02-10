'use client';

import { useState, useMemo } from 'react';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export function usePagination(items, defaultPerPage = 10) {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(defaultPerPage);

    const totalItems = items.length;
    const showAll = itemsPerPage === 'all';
    const totalPages = showAll ? 1 : Math.ceil(totalItems / itemsPerPage);

    const paginatedItems = useMemo(() => {
        if (showAll) return items;
        const start = (currentPage - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    }, [items, currentPage, itemsPerPage, showAll]);

    const setPerPage = (value) => {
        setItemsPerPage(value === 'all' ? 'all' : Number(value));
        setCurrentPage(1);
    };

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    // Reset to page 1 when items change significantly
    const resetPage = () => setCurrentPage(1);

    return {
        paginatedItems,
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage,
        setPerPage,
        goToPage,
        resetPage,
        showAll,
    };
}

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onPerPageChange,
}) {
    if (totalItems === 0) return null;

    const showAll = itemsPerPage === 'all';
    const startItem = showAll ? 1 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = showAll ? totalItems : Math.min(currentPage * itemsPerPage, totalItems);

    // Generate page numbers to show
    const getPageNumbers = () => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
        return pages;
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '12px',
            padding: '10px 0',
        }}>
            {/* Top row: per page selector + info */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
            }}>
                {/* Per page selector */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexWrap: 'wrap',
                }}>
                    <span style={{ fontSize: '10px', color: 'var(--dark-400)', fontWeight: '600' }}>
                        Tampilkan:
                    </span>
                    {PAGE_SIZE_OPTIONS.map(size => (
                        <button
                            key={size}
                            onClick={() => onPerPageChange(size)}
                            style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: itemsPerPage === size ? 'var(--emerald-600)' : 'var(--dark-700)',
                                color: itemsPerPage === size ? 'white' : 'var(--dark-400)',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'var(--transition-fast)',
                            }}
                        >
                            {size}
                        </button>
                    ))}
                    <button
                        onClick={() => onPerPageChange('all')}
                        style={{
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: showAll ? 'var(--emerald-600)' : 'var(--dark-700)',
                            color: showAll ? 'white' : 'var(--dark-400)',
                            fontSize: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)',
                        }}
                    >
                        Semua
                    </button>
                </div>

                {/* Info */}
                <span style={{
                    fontSize: '10px',
                    color: 'var(--dark-500)',
                    flexShrink: 0,
                }}>
                    {startItem}–{endItem} dari {totalItems}
                </span>
            </div>

            {/* Bottom row: page navigation (hide if showing all or only 1 page) */}
            {!showAll && totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '3px',
                }}>
                    {/* Prev button */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'var(--dark-700)',
                            color: currentPage === 1 ? 'var(--dark-600)' : 'var(--dark-300)',
                            fontSize: '11px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1,
                        }}
                    >
                        ◀
                    </button>

                    {/* Page numbers */}
                    {getPageNumbers().map((page, i) => (
                        page === '...' ? (
                            <span key={`dots-${i}`} style={{
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: 'var(--dark-500)',
                            }}>
                                ···
                            </span>
                        ) : (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: currentPage === page ? 'var(--emerald-600)' : 'var(--dark-700)',
                                    color: currentPage === page ? 'white' : 'var(--dark-400)',
                                    fontSize: '11px',
                                    fontWeight: currentPage === page ? '700' : '500',
                                    cursor: 'pointer',
                                    transition: 'var(--transition-fast)',
                                }}
                            >
                                {page}
                            </button>
                        )
                    ))}

                    {/* Next button */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'var(--dark-700)',
                            color: currentPage === totalPages ? 'var(--dark-600)' : 'var(--dark-300)',
                            fontSize: '11px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1,
                        }}
                    >
                        ▶
                    </button>
                </div>
            )}
        </div>
    );
}
