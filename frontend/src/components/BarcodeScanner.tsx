import React, { useState } from 'react';
import { useZxing } from 'react-zxing';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  // Używamy domyślnego namespace'u "translation" (tak masz zarejestrowane w i18n.ts)
  const { t } = useTranslation();

  const [isCodeDetected, setIsCodeDetected] = useState(false);

  const { ref } = useZxing({
    constraints: { video: { facingMode: 'environment' } },
    onDecodeResult(result) {
      if (!isCodeDetected) {
        setIsCodeDetected(true);
        if (navigator.vibrate) navigator.vibrate(200);
        setTimeout(() => onScan(result.getText()), 300);
      }
    },
    onError(error: unknown) {
      console.error(t('barcode.cameraErrorLog'), error);
      alert(t('barcode.cameraErrorAlert'));
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-4 flex flex-col items-center
                      dark:bg-slate-800 dark:text-slate-200">
        <h3 className="text-lg font-medium text-center mb-4 text-gray-800 dark:text-slate-100">
          {t('barcode.prompt')}
        </h3>

        <div className="relative w-full" style={{ paddingTop: '75%' }}>
          <video
            ref={ref}
            className="absolute top-0 left-0 w-full h-full object-cover rounded-md bg-gray-900"
            aria-label={t('barcode.videoAria')}
          />

          <div
            className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
            style={{ boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.5)' }}
            aria-hidden
          >
            <div
              className={clsx(
                'w-5/6 h-1/2 rounded-lg border-4 transition-colors duration-200',
                {
                  'border-white dark:border-slate-200': !isCodeDetected,
                  'border-green-500 dark:border-green-400': isCodeDetected,
                }
              )}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium
                     dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
        >
          {t('actions.cancel')}
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner;
