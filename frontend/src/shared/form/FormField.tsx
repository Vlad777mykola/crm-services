import type { CSSProperties, ReactNode } from 'react';

import './FormField.css';

interface FormFieldProps {
  children: ReactNode;
  error?: string;
  label?: ReactNode;
  style?: CSSProperties;
}

export function FormField({ children, error, label, style }: FormFieldProps) {
  return (
    <div className="crm-form-field" style={style}>
      {label && <label className="crm-form-field__label">{label}</label>}
      {children}
      {error && <div className="crm-form-field__error">{error}</div>}
    </div>
  );
}
