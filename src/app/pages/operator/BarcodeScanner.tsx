import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import '../../../styles/operator.css';

export const BarcodeScanner: React.FC = () => {
  const [scanValue, setScanValue] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Auto-focus the hidden input to always capture hardware scanner input
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && isScanning) {
        inputRef.current.focus();
      }
    };
    
    focusInput();
    document.addEventListener('click', focusInput);
    return () => document.removeEventListener('click', focusInput);
  }, [isScanning]);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue.trim()) return;

    // Route based on scanned prefix (e.g. GRN-, LOT-, BATCH-)
    const value = scanValue.trim().toUpperCase();
    
    setIsScanning(false);
    
    // Simulate routing delay for visual feedback
    setTimeout(() => {
      if (value.startsWith('GRN')) {
        navigate(`/operator/task?type=receive&ref=${value}`);
      } else if (value.startsWith('LOT')) {
        navigate(`/operator/task?type=consume&ref=${value}`);
      } else if (value.startsWith('BATCH')) {
        navigate(`/operator/task?type=output&ref=${value}`);
      } else {
        // Default routing
        navigate(`/operator/task?type=general&ref=${value}`);
      }
    }, 500);
  };

  return (
    <div className="operator-bg min-h-screen flex flex-col items-center justify-center p-6">
      
      <div className="absolute top-8 left-8">
        <h1 className="text-3xl font-bold text-white tracking-widest opacity-80">
          FACTORY <span className="text-[#2ecc71]">OS</span>
        </h1>
      </div>

      <div className="operator-card w-full max-w-2xl p-12 text-center">
        <div className="mb-8">
          <svg className="w-24 h-24 mx-auto text-[#2ecc71] opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>

        <h2 className="text-4xl font-bold text-white mb-4">Ready to Scan</h2>
        <p className="text-xl var(--op-text-muted) mb-12 opacity-60">Aim scanner at barcode or QR code</p>

        <form onSubmit={handleScanSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            className={`operator-input w-full p-6 text-center shadow-lg ${isScanning ? 'scanning-active' : ''}`}
            placeholder="Awaiting Input..."
            autoFocus
            autoComplete="off"
          />
        </form>
      </div>
      
      <div className="absolute bottom-8 text-center w-full">
        <p className="text-sm text-gray-500 uppercase tracking-widest">Operator Session Active • Terminal 04</p>
      </div>

    </div>
  );
};
