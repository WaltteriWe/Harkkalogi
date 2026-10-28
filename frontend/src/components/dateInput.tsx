"use client";

type DateInputProps = {
  id: string;
  label: string;
  /** ISO date string (yyyy-mm-dd), or "" when empty */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable date (yyyy-mm-dd), e.g. the start date for an end date field */
  min?: string;
  /** Latest selectable date (yyyy-mm-dd) */
  max?: string;
  disabled?: boolean;
};

export default function DateInput({
  id,
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: DateInputProps) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        className="input"
        value={value}
        min={min || undefined}
        max={max || undefined}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
