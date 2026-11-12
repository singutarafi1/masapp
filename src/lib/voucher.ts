import html2canvas from 'html2canvas';

declare global {
  interface Window {
    AndroidApp?: {
      saveVoucherBase64?: (base64DataUrl: string, fileName: string) => void;
      saveVoucherImage?: () => void;
      saveCsvFile?: (csvContent: string, fileName: string) => void;
      reloadApp?: () => void;
      showToast?: (msg: string) => void;
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
  const fileName = `MobileAnswer_VR${vrno}_${Date.now()}.png`;

  if (typeof window !== 'undefined' && window.AndroidApp) {
    if (typeof window.AndroidApp.saveVoucherBase64 === 'function') {
      window.AndroidApp.saveVoucherBase64(dataUrl, fileName);
      return;
    }
    if (typeof window.AndroidApp.saveVoucherImage === 'function') {
      window.AndroidApp.saveVoucherImage();
      return;
    }
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

