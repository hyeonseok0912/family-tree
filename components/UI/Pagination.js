import { useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(false);

  // 브라우저 리사이즈 대응
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize(); // 초기 실행
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const generatePageNumbers = () => {
    const visiblePages = isMobile ? 5 : 5;
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
    <div className={styles.paginationWrapper}>
      {/* 상단 조작부 */}
      <div className={styles.controlRow}>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            onPageChange(1);
          }}
          className={styles.select}
        >
          <option value={5}>5개씩</option>
          <option value={10}>10개씩</option>
          <option value={20}>20개씩</option>
        </select>

        <button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <MdKeyboardDoubleArrowLeft />
          {!isMobile && " 처음"}
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <MdKeyboardArrowLeft />
          {!isMobile && " 이전"}
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          {!isMobile && "다음 "}
          <MdKeyboardArrowRight />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          {!isMobile && "마지막 "}
          <MdKeyboardDoubleArrowRight />
        </button>
      </div>

      {/* 페이지 번호 */}
      <div className={styles.pageRow}>
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
      </div>
    </div>
  );
}
