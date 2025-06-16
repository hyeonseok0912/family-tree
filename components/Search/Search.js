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

    setError("");
    onSearch(query);
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // 새로고침 방지
    handleSearch();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchBox}>
      <div className={styles.yearPickerWrapper}>
        <DatePicker
          selected={startYear}
          onChange={(date) => setStartYear(date)}
          showYearPicker
          dateFormat="yyyy"
          placeholderText="출생 시작 연도"
          className={styles.yearPicker}
        />
        <p> ~ </p>
        <DatePicker
          selected={endYear}
          onChange={(date) => setEndYear(date)}
          showYearPicker
          dateFormat="yyyy"
          placeholderText="출생 종료 연도"
          className={styles.yearPicker}
        />

        <input
          type="text"
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
