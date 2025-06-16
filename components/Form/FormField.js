import styles from "./FormField.module.css";

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
  readOnly = false,
  multiline = false,
  placeholder = "",
  rows = 3,
  options = [],
}) {
  return (
    <label className={styles.label}>
      {label}
      {type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={required ? styles.required : ""}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={`${styles.textarea} ${required ? styles.required : ""}`}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`${required ? styles.required : ""} ${readOnly ? styles.readOnly : ""}`}
        />
      )}
    </label>
  );
}
