
import React from 'react';
import { COOLDOWN_TURNS } from '../constants';

interface UIOverlayProps {
  turn: number;
  lastActionTurn: number;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  turn,
  lastActionTurn,
}) => {
  const turnsRemaining = Math.max(0, COOLDOWN_TURNS - (turn - lastActionTurn));
  const ready = turnsRemaining === 0;

  return (
    <div className="absolute top-4 left-4 pointer-events-none z-40">
      {/* Small Top-Left Status */}
      <div className={`
          px-3 py-1 rounded shadow-[0_0_10px_rgba(0,0,0,0.8)] backdrop-blur-md
          transition-all duration-200 border text-xs font-bold font-mono tracking-widest
          ${ready ? 'bg-green-900/80 border-green-500 text-green-300' : 'bg-gray-900/80 border-gray-600 text-gray-500'}
      `}>
        {ready ? 'READY' : `WAIT (${turnsRemaining})`}
      </div>
    </div>
  );
};
