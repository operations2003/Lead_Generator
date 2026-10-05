import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="dropdown-wrapper" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'inline-block', cursor: 'pointer' }}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className="dropdown-menu animate-fade-in"
          style={{ [align]: 0 }}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.id || index}>
              {item.divider && <div className="dropdown-divider" />}
              <button
                type="button"
                className="dropdown-item"
                style={{ color: item.danger ? 'var(--status-error-text)' : undefined }}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
