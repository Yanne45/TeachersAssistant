import React from 'react';
import './Stepper.css';

export interface StepDef {
  label: string;
  status: 'done' | 'active' | 'pending';
  onClick?: () => void;
}

interface StepperProps {
  steps: StepDef[];
}

export const Stepper: React.FC<StepperProps> = ({ steps }) => (
  <div className="stepper">
    {steps.map((step, i) => (
      <React.Fragment key={step.label}>
        {i > 0 && (
          <div
            className={`stepper__connector ${
              steps[i - 1]?.status === 'done' ? 'stepper__connector--done' : ''
            }`}
          />
        )}
        <button
          type="button"
          className={`stepper__step stepper__step--${step.status}`}
          onClick={step.onClick}
          disabled={!step.onClick}
        >
          <span className="stepper__circle">
            {step.status === 'done' ? '✓' : i + 1}
          </span>
          <span className="stepper__label">{step.label}</span>
        </button>
      </React.Fragment>
    ))}
  </div>
);
