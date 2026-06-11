import html2canvas from 'html2canvas';

/** ~210mm at 96dpi — fixed width so mobile export matches desktop A4 layout */
export const INVOICE_EXPORT_WIDTH_PX = 794;

/**
 * Renders the invoice off-screen at A4 width, captures it, then restores the DOM node.
 * Avoids mobile modal/viewport clipping when generating PNG or PDF.
 */
export async function captureInvoiceForExport(element) {
  if (!element) {
    throw new Error('Invoice element not found');
  }

  const exportRoot = document.createElement('div');
  exportRoot.className = 'invoice-export-root';
  document.body.appendChild(exportRoot);

  const previousParent = element.parentElement;
  const nextSibling = element.nextSibling;

  exportRoot.appendChild(element);
  element.classList.add('exporting');

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  try {
    return await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: INVOICE_EXPORT_WIDTH_PX,
      windowWidth: INVOICE_EXPORT_WIDTH_PX,
      scrollX: 0,
      scrollY: -window.scrollY,
    });
  } finally {
    element.classList.remove('exporting');
    if (nextSibling) {
      previousParent.insertBefore(element, nextSibling);
    } else {
      previousParent.appendChild(element);
    }
    document.body.removeChild(exportRoot);
  }
}
