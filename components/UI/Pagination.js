import styles from "./Pagination.module.css";
import {
  MdKeyboardArrowLeft,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  setItemsPerPage,
}) {
  const generatePageNumbers = () => {
    const visiblePages = 5;
    let start = Math.max(currentPage - Math.floor(visiblePages / 2), 1);
    let end = start + visiblePages - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(end - visiblePages + 1, 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pages = generatePageNumbers();

  return (
    <div className={styles.pagination}>
      {/* 항목 수 선택 */}
      <select
        value={itemsPerPage}
        onChange={(e) => {
          setItemsPerPage(Number(e.target.value));
          onPageChange(1);
        }}
        className={styles.select}
      >
        <option value={10}>10개씩</option>
        <option value={20}>20개씩</option>
        <option value={50}>50개씩</option>
      </select>

      {/* 페이징 버튼 */}
      <button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
        <MdKeyboardDoubleArrowLeft /> 처음
      </button>

      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <MdKeyboardArrowLeft /> 이전
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`${styles.pageButton} ${
            page === currentPage ? styles.activePage : ""
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        다음 <MdKeyboardArrowRight />
      </button>

      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        마지막 <MdKeyboardDoubleArrowRight />
      </button>
    </div>
  );
}
