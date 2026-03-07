import React from 'react';
import './Breadcrumb.css';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <nav className="breadcrumb" aria-label="Navigation">
    {items.map((item, i) => {
      const isLast = i === items.length - 1;

      return (
        <React.Fragment key={i}>
          {isLast ? (
            <span className="breadcrumb__current">{item.label}</span>
          ) : (
            <button
              className="breadcrumb__link"
              onClick={item.onClick}
              type="button"
            >
              {item.label}
            </button>
          )}
          {!isLast && <span className="breadcrumb__sep">/</span>}
        </React.Fragment>
      );
    })}
  </nav>
);
