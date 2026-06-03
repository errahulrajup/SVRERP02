import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import '../../../styles/operator.css';

export const OperatorTask: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskType = searchParams.get('type');
  const taskRef = searchParams.get('ref');
  
  const [quantity, setQuantity] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNumpad = (num: string) => {
    if (quantity === '0' && num !== '.') {
      setQuantity(num);
    } else {
      // Prevent multiple decimals
      if (num === '.' && quantity.includes('.')) return;
      setQuantity(prev => prev + num);
    }
  };

  const handleClear = () => setQuantity('0');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call to backend
    await new Promise(r => setTimeout(r, 1000));
    setIsSubmitting(false);
    // Return to scanner
    navigate('/operator/scanner');
  };

  const getTaskDetails = () => {
    switch (taskType) {
      case 'receive': return { title: 'Receive Material', color: '#3498db' };
      case 'consume': return { title: 'Consume Lot', color: '#e67e22' };
      case 'output': return { title: 'Record Output', color: '#2ecc71' };
      default: return { title: 'Process Task', color: '#9b59b6' };
    }
  };

  const { title, color } = getTaskDetails();

  return (
    <div className="operator-bg min-h-screen flex flex-col items-center justify-center p-4">
      
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <button 
          onClick={() => navigate('/operator/scanner')}
          className="text-gray-400 hover:text-white px-6 py-3 rounded-xl border border-gray-700 bg-gray-900/50 text-xl font-bold uppercase"
        >
          &larr; Cancel
        </button>
        <div className="text-right">
          <p className="text-gray-400 uppercase tracking-wider text-sm font-bold mb-1">Scanned Reference</p>
          <p className="text-3xl font-mono text-white tracking-widest">{taskRef || 'UNKNOWN'}</p>
        </div>
      </div>

      <div className="operator-card w-full max-w-4xl p-8 md:p-12 flex flex-col md:flex-row gap-12">
        
        {/* Left Side: Info & Quantity Display */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-4xl font-bold mb-2 uppercase" style={{ color }}>{title}</h2>
            <p className="text-gray-400 text-xl mb-12">Enter quantity processed</p>
          </div>

          <div className="bg-black/40 border border-gray-700/50 rounded-2xl p-8 mb-8 text-right">
            <span className="text-7xl font-mono tracking-wider" style={{ color }}>
              {quantity}
            </span>
            <span className="text-3xl text-gray-500 ml-4">KG</span>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || quantity === '0'}
            className="operator-button w-full py-6 text-2xl flex items-center justify-center gap-4 disabled:opacity-50"
            style={{ backgroundImage: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}
          >
            {isSubmitting ? 'PROCESSING...' : 'CONFIRM TASK'}
            {!isSubmitting && (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Right Side: Numpad */}
        <div className="w-full md:w-96 grid grid-cols-3 gap-4">
          {['1','2','3','4','5','6','7','8','9','0','.'].map(num => (
            <button 
              key={num}
              onClick={() => handleNumpad(num)}
              className={`operator-numpad-btn py-8 font-mono font-bold ${num === '0' ? 'col-span-2' : ''}`}
            >
              {num}
            </button>
          ))}
          <button 
            onClick={handleClear}
            className="operator-numpad-btn py-8 text-red-400 border-red-900/30 font-bold uppercase text-xl"
          >
            CLR
          </button>
        </div>

      </div>

    </div>
  );
};
