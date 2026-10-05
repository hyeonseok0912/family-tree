import styles from "./ParentSelector.module.css";
import {useId} from 'react';
import { formatDate } from "../../utils/helpers";

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
  const optionsId=useId();
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {label}
        <input
          type="text"
          role="combobox"
          aria-controls={optionsId}
          aria-expanded={!!(showDropdown&&value)}
          aria-autocomplete="list"
          onKeyDown={event=>{if(event.key==='Escape')setShowDropdown(false);if(event.key==='ArrowDown'){event.preventDefault();event.currentTarget.parentElement.parentElement.querySelector('button')?.focus();}}}
          value={value}
          onChange={onInputChange}
          onFocus={() => setShowDropdown(true)}
          autoComplete="off"
          className={`${styles.input} ${required ? styles.required : ""}`}
          placeholder={placeholder}
        />
      </label>

      {showDropdown && value && (
        <ul id={optionsId} className={styles.dropdown}>
          {options.map((p) => (
            <li key={p.id}><button type="button" onClick={()=>onSelect(p)}>
              {p.name}
              {p.hanja && `(${p.hanja})`} - ({p.birth_date ? formatDate(p.birth_date) : "-"})
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
