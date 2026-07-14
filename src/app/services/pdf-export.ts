/**
 * Rasterises a rendered element and saves it as a paginated A4 PDF.
 *
 * html2canvas cannot capture an element that is display:none, and it captures whatever
 * slice of a scrolled container happens to be visible. So the element is cloned into a
 * fixed-width wrapper pinned behind the app: the capture is then a stable, full-height
 * layout independent of the user's scroll position or viewport width.
 *
 * Keep the captured markup on plain hex/rgb colours. html2canvas v1.x cannot parse modern
 * colour functions such as oklch()/lab() and throws while rasterising, which is an easy way
 * to end up with a blank PDF.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  captureWidth = 900
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.zIndex = '-9999';
  wrapper.style.width = `${captureWidth}px`;
  wrapper.style.padding = '24px';
  wrapper.style.background = '#ffffff';
  wrapper.appendChild(element.cloneNode(true));
  document.body.appendChild(wrapper);

  try {
    await waitForImages(wrapper);

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: wrapper.scrollWidth,
      width: wrapper.scrollWidth,
      height: wrapper.scrollHeight
    });

    canvasToPdf(canvas, jsPDF, filename);
  } finally {
    wrapper.remove();
  }
}

function canvasToPdf(canvas: HTMLCanvasElement, jsPDF: any, filename: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 24;
  const usableWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const usableHeight = doc.internal.pageSize.getHeight() - margin * 2;

  // Scale the capture to the page width; its height follows the aspect ratio and may run
  // past one page, so draw the same image on each page shifted up by one page height.
  const imageHeight = (canvas.height * usableWidth) / canvas.width;
  const imageData = canvas.toDataURL('image/png');

  let remaining = imageHeight;
  doc.addImage(imageData, 'PNG', margin, margin, usableWidth, imageHeight);
  remaining -= usableHeight;

  while (remaining > 0) {
    const offset = margin - (imageHeight - remaining);
    doc.addPage();
    doc.addImage(imageData, 'PNG', margin, offset, usableWidth, imageHeight);
    remaining -= usableHeight;
  }

  doc.save(filename);
}

function waitForImages(root: HTMLElement): Promise<void> {
  const pending = Array.from(root.getElementsByTagName('img'))
    .filter(img => !img.complete || img.naturalWidth === 0)
    .map(img => new Promise<void>(resolve => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    }));

  if (!pending.length) {
    return Promise.resolve();
  }

  // Never let a stalled asset block the export.
  return Promise.race([
    Promise.all(pending).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, 3000))
  ]);
}

export function toFilenameSlug(value: string, fallback: string): string {
  const slug = (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || fallback;
}
