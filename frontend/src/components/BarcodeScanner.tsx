import React, { useState } from 'react';
import { useZxing } from 'react-zxing';
import clsx from 'clsx';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [isCodeDetected, setIsCodeDetected] = useState(false);

  const { ref } = useZxing({
    constraints: { video: { facingMode: 'environment' } },
    onDecodeResult(result) {
      if (!isCodeDetected) {
        setIsCodeDetected(true);

        if (navigator.vibrate) {
          navigator.vibrate(200);
        }

        setTimeout(() => {
          onScan(result.getText());
        }, 300);
      }
    },
    onError(error: unknown) {
        console.error("Błąd inicjalizacji kamery:", error);
        alert("Nie udało się uzyskać dostępu do kamery. Sprawdź uprawnienia w przeglądarce.");
        onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-4 flex flex-col items-center">
        <h3 className="text-lg font-medium text-center mb-4 text-gray-800">Skieruj aparat na kod kreskowy</h3>

        <div className="relative w-full" style={{ paddingTop: '75%' }}>
          <video ref={ref} className="absolute top-0 left-0 w-full h-full object-cover rounded-md bg-gray-900" />

          <div
            className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
            style={{ boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.5)' }}
          >
            <div className={clsx(
              "w-5/6 h-1/2 rounded-lg border-4 transition-colors duration-200",
              {
                "border-white": !isCodeDetected,
                "border-green-500": isCodeDetected,
              }
            )} />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner;
