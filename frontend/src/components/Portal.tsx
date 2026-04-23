import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

const Portal: React.FC<PortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let modalRoot = document.getElementById('modal-root');
    let created = false;

    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
      created = true;
    }

    setPortalElement(modalRoot);

    return () => {
      if (created && modalRoot?.parentNode) {
        modalRoot.parentNode.removeChild(modalRoot);
      }
    };
  }, [mounted]);

  if (!mounted || !portalElement) {
    return null;
  }

  return createPortal(children, portalElement);
};

export default Portal;
