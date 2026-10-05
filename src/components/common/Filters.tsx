import React from 'react';
import { Filter, X } from 'lucide-react';
import { SearchInput } from './SearchInput';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

export interface ActiveFilter {
  key: string;
  label: string;
  displayValue: string;
  onRemove: () => void;
}

export interface FiltersProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filterOptions?: FilterOption[];
  activeFilters?: ActiveFilter[];
  onClearAll?: () => void;
  children?: React.ReactNode;
}

export const Filters: React.FC<FiltersProps> = ({
  searchPlaceholder = 'Search records...',
  searchValue = '',
  onSearchChange,
  filterOptions = [],
  activeFilters = [],
  onClearAll,
  children,
}) => {
  return (
    <div className="filter-bar">
      <div className="filter-left">
        {onSearchChange && (
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onSearch={onSearchChange}
          />
        )}
        {filterOptions.map((opt) => (
          <select
            key={opt.key}
            className="form-select"
            style={{ width: 'auto', minWidth: '140px' }}
            value={opt.value}
            onChange={(e) => opt.onChange(e.target.value)}
          >
            <option value="">{opt.label}</option>
            {opt.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {children}
      </div>

      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Filter size={12} /> Active:
          </span>
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="badge badge-neutral"
              style={{ paddingRight: '0.35rem', cursor: 'pointer' }}
              onClick={f.onRemove}
            >
              <span>{f.label}: <strong>{f.displayValue}</strong></span>
              <X size={12} />
            </span>
          ))}
          {onClearAll && (
            <button
              onClick={onClearAll}
              style={{ fontSize: '0.75rem', color: 'var(--primary-400)', textDecoration: 'underline', padding: '0 0.25rem' }}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};
