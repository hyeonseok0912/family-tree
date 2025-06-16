import styles from "./ParentSelector.module.css";

export default function ParentSelector({
  label = "부모 성명",
  value,
  onInputChange,
  onSelect,
  options = [],
  showDropdown,
  setShowDropdown,
  required = false,
  placeholder = "",
}) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {label}
        <input
          type="text"
          value={value}
          onChange={onInputChange}
          onFocus={() => setShowDropdown(true)}
          autoComplete="off"
          className={`${styles.input} ${required ? styles.required : ""}`}
          placeholder={placeholder}
        />
      </label>

      {showDropdown && value && (
        <ul className={styles.dropdown}>
          {options.map((p) => (
            <li
              key={p.id}
              onClick={() => {
                onSelect(p);
              }}
            >
              {p.name} ({p.birth_date || "?"})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
