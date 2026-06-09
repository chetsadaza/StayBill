import { useEffect } from 'react';
import { MdCheckCircle, MdError, MdInfo, MdWarning, MdClose } from 'react-icons/md';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <MdCheckCircle size={22} style={{ color: 'var(--color-success)' }} />,
    error: <MdError size={22} style={{ color: 'var(--color-danger)' }} />,
    warning: <MdWarning size={22} style={{ color: 'var(--color-warning)' }} />,
    info: <MdInfo size={22} style={{ color: 'var(--color-info)' }} />
  };

  const borders = {
    success: 'rgba(16, 185, 129, 0.3)',
    error: 'rgba(239, 68, 68, 0.3)',
    warning: 'rgba(245, 158, 11, 0.3)',
    info: 'rgba(59, 130, 246, 0.3)'
  };

  return (
    <div 
      className="glass-card toast-animation toast-responsive" 
      style={{ 
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderLeft: `5px solid ${type === 'success' ? 'var(--color-success)' : type === 'error' ? 'var(--color-danger)' : type === 'warning' ? 'var(--color-warning)' : 'var(--color-info)'}`,
        borderColor: borders[type],
        background: 'var(--bg-secondary)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {icons[type]}
      </div>
      <div style={{ flex: 1, fontSize: '0.925rem', fontWeight: 500, color: 'var(--text-primary)' }}>
        {message}
      </div>
      <button 
        onClick={onClose}
        style={{ 
          background: 'none', 
          border: 'none', 
          color: 'var(--text-secondary)', 
          cursor: 'pointer',
          display: 'flex',
          padding: '4px',
          borderRadius: '50%',
          transition: 'var(--transition-fast)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <MdClose size={18} />
      </button>
    </div>
  );
}
