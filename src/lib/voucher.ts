import html2canvas from 'html2canvas';

declare global {
  interface Window {
    AndroidApp?: {
      saveVoucherImage?: () => void;
      startVoice?: () => void;
    };
  }
}

export async function exportVoucherImage(element: HTMLElement, vrno: string | number): Promise<string> {
  const canvas = await html2canvas(element, {
    scale: 3,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

export function downloadVoucherDataUrl(dataUrl: string, vrno: string | number) {
  if (typeof window !== 'undefined' && window.AndroidApp?.saveVoucherImage) {
    window.AndroidApp.saveVoucherImage();
    return;
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `MobileAnswer_VR${vrno}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
