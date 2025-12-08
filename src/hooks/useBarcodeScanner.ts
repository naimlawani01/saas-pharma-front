import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxLength?: number;
  timeout?: number; // Timeout entre les caractères (ms)
}

/**
 * Hook pour gérer le scan de code-barres
 * Supporte :
 * - Scanners USB qui émulent un clavier (le plus courant)
 * - Scanners Serial/Bluetooth via Web Serial API
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 8,
  maxLength = 20,
  timeout = 100, // 100ms entre les caractères = scan rapide
}: UseBarcodeScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannerType, setScannerType] = useState<'keyboard' | 'serial' | null>(null);
  const barcodeBuffer = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCharTime = useRef<number>(0);

  // Détection des scanners USB (clavier)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer les touches spéciales (Shift, Ctrl, Alt, etc.)
      if (e.key.length > 1 && !['Enter', 'Tab'].includes(e.key)) {
        return;
      }

      // Si Enter est pressé, traiter le code-barres accumulé
      if (e.key === 'Enter') {
        e.preventDefault();
        const barcode = barcodeBuffer.current.trim();
        if (barcode.length >= minLength && barcode.length <= maxLength) {
          onScan(barcode);
        }
        barcodeBuffer.current = '';
        setIsScanning(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        return;
      }

      // Ignorer si l'utilisateur tape dans un input (sauf si c'est vide)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const input = target as HTMLInputElement;
        // Si l'input a du texte et le focus, c'est probablement une saisie manuelle
        if (input.value.length > 0 && document.activeElement === input) {
          // Mais si les caractères arrivent très vite, c'est peut-être un scan
          const now = Date.now();
          const timeSinceLastChar = now - lastCharTime.current;
          
          // Si les caractères arrivent très vite (< 50ms), c'est probablement un scan
          if (timeSinceLastChar > 50) {
            return; // Saisie manuelle
          }
        }
      }

      // Détecter si c'est un scan (caractères rapides) ou une saisie manuelle
      const now = Date.now();
      const timeSinceLastChar = now - lastCharTime.current;

      // Si le temps entre les caractères est très court (< timeout), c'est probablement un scan
      if (timeSinceLastChar < timeout && timeSinceLastChar > 0) {
        setIsScanning(true);
        setScannerType('keyboard');
        barcodeBuffer.current += e.key;
        lastCharTime.current = now;

        // Réinitialiser le timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          const barcode = barcodeBuffer.current.trim();
          if (barcode.length >= minLength && barcode.length <= maxLength) {
            onScan(barcode);
          }
          barcodeBuffer.current = '';
          setIsScanning(false);
        }, timeout);
      } else {
        // Nouveau scan ou saisie manuelle
        barcodeBuffer.current = e.key;
        lastCharTime.current = now;
        setIsScanning(true);
        setScannerType('keyboard');

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          const barcode = barcodeBuffer.current.trim();
          if (barcode.length >= minLength && barcode.length <= maxLength) {
            onScan(barcode);
          }
          barcodeBuffer.current = '';
          setIsScanning(false);
        }, timeout);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, onScan, minLength, maxLength, timeout]);

  // Support Web Serial API pour scanners Serial/Bluetooth
  const connectSerialScanner = useCallback(async () => {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API non supportée dans ce navigateur');
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });

      setScannerType('serial');
      setIsScanning(true);

      const reader = port.readable.getReader();
      const decoder = new TextDecoder();

      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim());

            for (const line of lines) {
              const barcode = line.trim();
              if (barcode.length >= minLength && barcode.length <= maxLength) {
                onScan(barcode);
              }
            }
          }
        } catch (error) {
          console.error('Erreur lecture scanner:', error);
          setIsScanning(false);
        } finally {
          reader.releaseLock();
        }
      };

      readLoop();

      return () => {
        reader.cancel();
        port.close();
        setIsScanning(false);
      };
    } catch (error) {
      console.error('Erreur connexion scanner:', error);
      throw error;
    }
  }, [onScan, minLength, maxLength]);

  return {
    isScanning,
    scannerType,
    connectSerialScanner,
    isSerialSupported: 'serial' in navigator,
  };
}

