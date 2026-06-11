import { useState, useRef, useEffect } from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';

export default function CustomSelect({ name, value, onChange, options, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredVal, setHoveredVal] = useState(null);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    if (disabled) return;
    onChange({ target: { name, value: val } });
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      data-name={name}
      className={`custom-select-container ${disabled ? 'disabled' : ''}`}
    >
      <div 
        className={`form-input custom-select-trigger ${isOpen ? 'custom-select-trigger-open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          borderColor: isOpen ? 'var(--accent-primary)' : undefined,
          boxShadow: isOpen ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : undefined,
        }}
      >
        <span className="custom-select-trigger-label">
          {selectedOption?.icon}
          <span>{selectedOption?.label}</span>
        </span>
        <MdKeyboardArrowDown 
          size={20} 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            color: 'var(--text-secondary)',
            flexShrink: 0,
          }} 
        />
      </div>

      {isOpen && (
        <div className="custom-select-options-list" style={{ animation: 'fadeInUp 0.15s ease-out' }}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isHovered = hoveredVal === opt.value;
            return (
              <div 
                key={opt.value}
                className={`custom-select-option ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoveredVal(opt.value)}
                onMouseLeave={() => setHoveredVal(null)}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
