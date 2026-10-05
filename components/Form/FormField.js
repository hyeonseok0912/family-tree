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
  maxLength,
}) {
  return (
    <label className={styles.label}>
      {label}
      {type === "select" ? (
        <select
          name={name}
          value={value ?? ""}
          onChange={onChange}
          required={required}
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
          required={required}
          readOnly={readOnly}
          maxLength={maxLength}
          className={`${styles.textarea} ${required ? styles.required : ""}`}
        />
      ) : (
        <input
          type={type}
          min={type === "number" ? 1 : undefined}
          max={type === "number" ? 2147483647 : undefined}
          step={type === "number" ? 1 : undefined}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          className={`${required ? styles.required : ""} ${
            readOnly ? styles.readOnly : ""
          }`}
        />
      )}
    </label>
  );
}
