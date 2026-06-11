'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatBillingMonth } from '@/lib/utils';
import jsPDF from 'jspdf';
import { captureInvoiceForExport } from '@/lib/invoiceExport';
import { MdPictureAsPdf, MdImage } from 'react-icons/md';
import Toast from '@/components/ui/Toast';
import InvoiceDocument from '@/components/billing/InvoiceDocument';

export default function ShareBillPage() {
  const params = useParams();
  const [bill, setBill] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const printRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const [billRes, settingsRes] = await Promise.all([
          api.getBill(params.id),
          api.getSettings()
        ]);
        if (billRes.success) setBill(billRes.data);
        if (settingsRes.success) setSettings(settingsRes.data);
      } catch (err) {
        setError('ไม่พบใบแจ้งหนี้ หรือลิงก์ไม่ถูกต้อง');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchBill();
  }, [params.id]);

  const generatePDF = async () => {
    if (!bill) return;
    const element = printRef.current;
    if (!element) return;

    try {
      showToast('กำลังเตรียมไฟล์ PDF...', 'info');
      const canvas = await captureInvoiceForExport(element);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ใบแจ้งหนี้_ห้อง${bill.room.roomNumber}_${bill.billingMonth}.pdf`);
      showToast('ดาวน์โหลด PDF สำเร็จ', 'success');
    } catch (err) {
      console.error('Failed to generate PDF', err);
      showToast('ไม่สามารถแปลงใบแจ้งหนี้เป็น PDF ได้', 'error');
    }
  };

  const generateImage = async () => {
    if (!bill) return;
    const element = printRef.current;
    if (!element) return;

    try {
      showToast('กำลังเตรียมไฟล์รูปภาพ...', 'info');
      const canvas = await captureInvoiceForExport(element);
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `ใบแจ้งหนี้_ห้อง${bill.room.roomNumber}_${bill.billingMonth}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('ดาวน์โหลดรูปภาพใบแจ้งหนี้สำเร็จ', 'success');
    } catch (err) {
      console.error('Failed to generate Image', err);
      showToast('ไม่สามารถแปลงใบแจ้งหนี้เป็นรูปภาพได้', 'error');
    }
  };

  if (loading) {
    return (
      <div className="share-bill-state-page">
        <div className="spinner"></div>
        <p className="share-bill-state-text">กำลังโหลดใบแจ้งหนี้...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="share-bill-state-page">
        <div className="share-bill-state-emoji" aria-hidden>😔</div>
        <h2 className="share-bill-state-title">ไม่พบใบแจ้งหนี้</h2>
        <p className="share-bill-state-text">
          {error || 'ลิงก์นี้อาจไม่ถูกต้องหรือใบแจ้งหนี้ถูกลบไปแล้ว กรุณาติดต่อผู้ดูแลหอพัก'}
        </p>
      </div>
    );
  }

  return (
    <div className="share-bill-page">
      <div className="share-bill-action-header">
        <div className="invoice-preview-heading">
          <h3 className="share-bill-action-title">ใบแจ้งหนี้ค่าเช่า</h3>
          <p className="invoice-preview-subtitle">
            ห้อง {bill.room?.roomNumber} · {formatBillingMonth(bill.billingMonth)}
            {bill.isPaid && ' · ชำระแล้ว'}
          </p>
        </div>
        <div className="share-bill-toolbar">
          <button type="button" className="btn btn-secondary invoice-btn-icon" onClick={generateImage}>
            <MdImage size={18} aria-hidden />
            <span>PNG</span>
          </button>
          <button type="button" className="btn btn-primary invoice-btn-icon" onClick={generatePDF}>
            <MdPictureAsPdf size={18} aria-hidden />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="share-bill-paper-wrapper">
        <InvoiceDocument
          bill={bill}
          settings={settings}
          printRef={printRef}
          className="invoice-paper--standalone"
        />
      </div>

      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}
    </div>
  );
}
