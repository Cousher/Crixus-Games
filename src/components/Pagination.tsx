import React from "react";

interface PaginationProps {
    totalPages: number;
    currentPage: number;
    setPage: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ totalPages, currentPage, setPage }) => {
    const renderPageNumber = (pageNumber: number) => {
        const active = pageNumber === currentPage;
        return (
            <button
                type="button"
                key={pageNumber}
                aria-current={active ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
                className={`w-10 h-10 p-0 rounded-xl border font-mono text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer ${
                    active
                        ? "border-[#ffd966] bg-gradient-to-b from-[#e6ca6a] to-[#a67e1c] text-[#1a1204] shadow-[0_0_14px_rgba(212,175,55,0.4)]"
                        : "border-[#3a2f1d] bg-[#14100b] text-[#b9a77a] hover:border-[#d4af37] hover:text-[#ffe9a8]"
                }`}
            >
                {pageNumber}
            </button>
        );
    };

    const renderPagination = () => {
        let pages: React.ReactNode[] = [];

        if (totalPages <= 0) return null;

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(renderPageNumber(i));
            }
        } else if (currentPage <= 4) {
            pages = [
                ...Array.from({ length: 5 }, (_, i) => renderPageNumber(i + 1)),
                <span key="ellipsis1" className="text-[#8a7f63] px-1">…</span>,
                renderPageNumber(totalPages),
            ];
        } else if (currentPage + 3 >= totalPages) {
            pages = [
                renderPageNumber(1),
                <span key="ellipsis1" className="text-[#8a7f63] px-1">…</span>,
                ...Array.from({ length: 5 }, (_, i) => renderPageNumber(totalPages - 4 + i)),
            ];
        } else {
            pages = [
                renderPageNumber(1),
                <span key="ellipsis1" className="text-[#8a7f63] px-1">…</span>,
                ...Array.from({ length: 5 }, (_, i) => renderPageNumber(currentPage - 2 + i)),
                <span key="ellipsis2" className="text-[#8a7f63] px-1">…</span>,
                renderPageNumber(totalPages),
            ];
        }

        return pages;
    };

    return (
        <nav aria-label="Paginación" className="flex flex-wrap gap-2 items-center justify-center py-3">
            {renderPagination()}
        </nav>
    );
};

export default Pagination;
