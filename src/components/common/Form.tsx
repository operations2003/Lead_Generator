import React from 'react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required,
  children,
  className = '',
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label">
          <span>
            {label} {required && <span style={{ color: 'var(--status-error-text)' }}>*</span>}
          </span>
        </label>
      )}
      {children}
      {error && <span className="form-error">{error}</span>}
      {!error && helperText && <span className="form-helper">{helperText}</span>}
    </div>
  );
};

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, icon, className = '', ...props }, ref) => {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`form-input ${className}`}
          style={{
            paddingLeft: icon ? '2.5rem' : undefined,
            borderColor: error ? 'var(--status-error-text)' : undefined,
          }}
          {...props}
        />
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

export interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string | number; label: string }>;
  error?: boolean;
}

export const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ options, error, className = '', ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`form-select ${className}`}
        style={{ borderColor: error ? 'var(--status-error-text)' : undefined }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);
SelectInput.displayName = 'SelectInput';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const CheckboxInput = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
        <input
          type="checkbox"
          ref={ref}
          className={className}
          style={{ accentColor: 'var(--primary-600)', width: '16px', height: '16px', cursor: 'pointer' }}
          {...props}
        />
        <span>{label}</span>
      </label>
    );
  }
);
CheckboxInput.displayName = 'CheckboxInput';

export interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextareaInput = React.forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`form-textarea ${className}`}
        style={{ borderColor: error ? 'var(--status-error-text)' : undefined, resize: 'vertical', minHeight: '80px' }}
        {...props}
      />
    );
  }
);
TextareaInput.displayName = 'TextareaInput';
