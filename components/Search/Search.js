import { useState } from "react";
import DatePicker from "react-datepicker";
import styles from "./Search.module.css";
import "react-datepicker/dist/react-datepicker.css";

export default function Search({ onSearch }) {
  const [name, setName] = useState("");
  const [startYear, setStartYear] = useState(null);
  const [endYear, setEndYear] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = () => {
    const query = {
      name: name.trim(),
      startYear: startYear ? startYear.getFullYear() : "",
      endYear: endYear ? endYear.getFullYear() : "",
    };

    if (query.startYear && query.endYear && query.startYear>query.endYear) {setError("시작 연도는 종료 연도보다 늦을 수 없습니다.");return;}
    setError("");
    onSearch(query);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchBox}>
      <div className={styles.yearPickerWrapper}>
        <span id="birth-start-label" className="sr-only">출생 시작 연도</span><span id="birth-end-label" className="sr-only">출생 종료 연도</span>
        <DatePicker
          ariaLabelledBy="birth-start-label"
          selected={startYear}
          onChange={(date) => setStartYear(date)}
          showYearPicker
          dateFormat="yyyy"
          placeholderText="출생 시작 연도"
          className={styles.yearPicker}
        />
        <span> ~ </span>
        <DatePicker
          ariaLabelledBy="birth-end-label"
          selected={endYear}
          onChange={(date) => setEndYear(date)}
          showYearPicker
          dateFormat="yyyy"
          placeholderText="출생 종료 연도"
          className={styles.yearPicker}
        />
      </div>

      <div className={styles.nameSearchWrapper}>
        <input
          type="text"
          aria-label="검색할 이름"
          maxLength={80}
          placeholder="이름을 입력하세요"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className={styles.searchBtn}>
          🔍 검색
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
