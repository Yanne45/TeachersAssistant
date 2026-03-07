import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, fullWidth = false, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className={`input-group ${fullWidth ? 'input-group--full' : ''} ${className}`}>
        {label && (
          <label className="input-group__label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className={`input-wrapper ${error ? 'input-wrapper--error' : ''}`}>
          {icon && <span className="input-wrapper__icon">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className="input-wrapper__field"
            {...props}
          />
        </div>
        {error && <span className="input-group__error">{error}</span>}
        {hint && !error && <span className="input-group__hint">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
