import { MdHelpOutline, MdClose } from 'react-icons/md';

export default function ConfirmModal({ message, onConfirm, onCancel, confirmText = 'ตกลง', cancelText = 'ยกเลิก' }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div 
        className="glass-card confirm-modal-animation" 
        style={{ 
          width: '90%', 
          maxWidth: '480px', 
          padding: '28px', 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '50%', 
          background: 'rgba(99, 102, 241, 0.15)', 
          display: 'flex', 
          alignItems: 'center', 
          justify: 'center',
          color: 'var(--accent-primary)',
          marginBottom: '4px'
        }}>
          <MdHelpOutline size={32} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>ยืนยันการทำรายการ</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{message}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ flex: 1, padding: '10px' }}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '10px' }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
