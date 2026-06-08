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
      style={{ position: 'relative', width: '100%' }}
    >
      <div 
        className="form-input custom-select-trigger" 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          background: 'var(--input-bg)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
          boxShadow: isOpen ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
          height: '46px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
          {selectedOption?.icon}
          <span>{selectedOption?.label}</span>
        </span>
        <MdKeyboardArrowDown 
          size={20} 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            color: 'var(--text-secondary)'
          }} 
        />
      </div>

      {isOpen && (
        <div 
          className="custom-select-options-list glass-card"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-md)',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            animation: 'fadeInUp 0.15s ease-out',
            boxSizing: 'border-box',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isHovered = hoveredVal === opt.value;
            return (
              <div 
                key={opt.value}
                onMouseEnter={() => setHoveredVal(opt.value)}
                onMouseLeave={() => setHoveredVal(null)}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: isSelected 
                    ? 'var(--accent-gradient, var(--accent-primary))' 
                    : isHovered 
                      ? 'rgba(99, 102, 241, 0.08)' 
                      : 'transparent',
                  color: isSelected 
                    ? '#ffffff' 
                    : isHovered 
                      ? 'var(--accent-primary)' 
                      : 'var(--text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '0.95rem',
                  transition: 'all 0.15s ease',
                }}
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
