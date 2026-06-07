/**
 * SignaturePad — React wrapper around the stable `signature_pad` v5 package
 * Replaces the defunct `react-signature-canvas` alpha.
 *
 * Usage:
 *   const ref = useRef<SignaturePadHandle>(null);
 *   <SignaturePad ref={ref} width={400} height={150} />
 *   ref.current?.isEmpty()   // boolean
 *   ref.current?.toDataURL() // 'data:image/png;base64,...'
 *   ref.current?.clear()     // void
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import SigPad from 'signature_pad';

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string;
  clear: () => void;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  className?: string;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad(
    { width = 500, height = 150, penColor = '#000', backgroundColor = 'rgba(0,0,0,0)', className },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef    = useRef<SigPad | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Scale for high-DPI screens
      const ratio  = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width  = width  * ratio;
      canvas.height = height * ratio;
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d')?.scale(ratio, ratio);

      padRef.current = new SigPad(canvas, { penColor, backgroundColor });

      return () => {
        padRef.current?.off();
        padRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      isEmpty:   () => padRef.current?.isEmpty()     ?? true,
      toDataURL: (type?: string) => padRef.current?.toDataURL(type) ?? '',
      clear:     () => padRef.current?.clear(),
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ display: 'block', touchAction: 'none' }}
      />
    );
  }
);
