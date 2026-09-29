"use client";

export function MachineAttributeInput({ label, listId, value, suggestions, onChange, required = false, placeholder }: {
  label: string;
  listId: string;
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label>
      {label}
      <input value={value} list={listId} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} />
      <datalist id={listId}>
        {suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
      </datalist>
    </label>
  );
}
