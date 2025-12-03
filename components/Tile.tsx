
import React from 'react';
import { TileType, EntityType, ClassType, Entity, CustomTile } from '../types';
import { COLORS, TILE_SIZE } from '../constants';

interface TileProps {
  x: number;
  y: number;
  type: TileType; // This can be > 99 for custom tiles
  isHovered: boolean;
  isPath: boolean;
  pathIndex: number;       
  pathColor?: 'green' | 'red'; 
  pathRotation?: number;   
  hasEntity: boolean;
  entities?: Entity[];
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  isVisible: boolean;
  hasRoof?: boolean;
  isReady?: boolean;
  isHighlighted?: boolean;
  doorOrientation?: 'front' | 'side';
  customTiles?: CustomTile[];
}

// --- SPRITE COMPONENTS ---
const SpriteKnight: React.FC = () => (
  <svg viewBox="0 0 64 64" className="w-24 h-24 drop-shadow-lg filter -mb-3" style={{ transform: 'scale(1)', transformOrigin: 'bottom center' }}>
     <defs><filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="rgba(0,0,0,0.5)"/></filter></defs>
     <rect x="22" y="45" width="6" height="12" fill="#525252" />
     <rect x="36" y="45" width="6" height="12" fill="#525252" />
     <rect x="20" y="55" width="10" height="4" fill="#262626" />
     <rect x="34" y="55" width="10" height="4" fill="#262626" />
     <rect x="20" y="25" width="24" height="24" rx="2" fill="#9ca3af" stroke="#4b5563" strokeWidth="1" />
     <path d="M22 27 L42 27 L40 46 L24 46 Z" fill="#d1d5db" />
     <rect x="28" y="28" width="8" height="18" fill="#ef4444" opacity="0.8" /> 
     <rect x="24" y="10" width="16" height="18" rx="2" fill="#d1d5db" stroke="#4b5563" />
     <rect x="26" y="16" width="12" height="4" fill="#1f2937" /> 
     <path d="M32 2 L24 10 L40 10 Z" fill="#dc2626" /> 
     <path d="M42 30 L56 30 L56 42 C56 48 42 52 42 52 L42 30 Z" fill="#1e3a8a" stroke="#fbbf24" strokeWidth="2" />
     <path d="M46 34 L52 34 L52 40 L46 40 Z" fill="#fbbf24" />
     <rect x="12" y="20" width="4" height="26" fill="#e5e7eb" stroke="#9ca3af" />
     <rect x="10" y="44" width="8" height="2" fill="#4b5563" />
     <rect x="13" y="46" width="2" height="6" fill="#78350f" />
  </svg>
);

const SpriteRogue: React.FC = () => (
  <svg viewBox="0 0 64 64" className="w-24 h-24 drop-shadow-lg -mb-3" style={{ transform: 'scale(1)', transformOrigin: 'bottom center' }}>
     <rect x="22" y="45" width="6" height="12" fill="#1f2937" />
     <rect x="36" y="45" width="6" height="12" fill="#1f2937" />
     <rect x="22" y="28" width="20" height="20" fill="#374151" />
     <path d="M22 28 L42 28 L44 50 L20 50 Z" fill="#111827" /> 
     <path d="M22 10 L42 10 L44 26 L20 26 Z" fill="#111827" />
     <rect x="26" y="16" width="12" height="8" fill="#000" opacity="0.8" /> 
     <rect x="28" y="18" width="3" height="1" fill="#fff" /> 
     <rect x="34" y="18" width="3" height="1" fill="#fff" /> 
     <path d="M12 30 L20 38 L16 42 L8 34 Z" fill="#9ca3af" />
     <path d="M52 30 L44 38 L48 42 L56 34 Z" fill="#9ca3af" />
  </svg>
);

const SpriteWizard: React.FC = () => (
  <svg viewBox="0 0 64 64" className="w-24 h-24 drop-shadow-lg -mb-3" style={{ transform: 'scale(1)', transformOrigin: 'bottom center' }}>
     <path d="M18 60 L46 60 L42 26 L22 26 Z" fill="#4c1d95" />
     <rect x="28" y="26" width="8" height="34" fill="#a78bfa" opacity="0.5" />
     <rect x="24" y="14" width="16" height="14" fill="#fca5a5" />
     <rect x="26" y="20" width="12" height="4" fill="#e5e5e5" /> 
     <path d="M16 14 L48 14 L32 -6 Z" fill="#4c1d95" />
     <path d="M16 14 L48 14" stroke="#a78bfa" strokeWidth="2" />
     <rect x="50" y="10" width="4" height="50" fill="#78350f" />
     <circle cx="52" cy="10" r="5" fill="#3b82f6" className="animate-pulse" />
  </svg>
);

const SpriteOrc: React.FC = () => (
  <svg viewBox="0 0 64 64" className="w-24 h-24 drop-shadow-md -mb-3" style={{ transform: 'scale(1)', transformOrigin: 'bottom center' }}>
     <rect x="20" y="24" width="24" height="24" fill="#15803d" /> 
     <rect x="22" y="48" width="8" height="10" fill="#4b5563" /> 
     <rect x="34" y="48" width="8" height="10" fill="#4b5563" /> 
     <path d="M20 24 L44 24 L42 40 L22 40 Z" fill="#78350f" /> 
     <rect x="18" y="30" width="6" height="14" fill="#15803d" /> 
     <rect x="40" y="30" width="6" height="14" fill="#15803d" /> 
     <rect x="22" y="12" width="20" height="14" fill="#166534" />
     <rect x="24" y="18" width="4" height="2" fill="#000" /> 
     <rect x="36" y="18" width="4" height="2" fill="#000" /> 
     <path d="M26 26 L26 22 L28 22 Z" fill="#fef3c7" /> 
     <path d="M38 26 L38 22 L36 22 Z" fill="#fef3c7" /> 
     <rect x="8" y="20" width="4" height="30" fill="#78350f" transform="rotate(-15 10 35)" />
     <path d="M4 18 L16 18 L18 28 L2 28 Z" fill="#525252" transform="rotate(-15 10 35)" />
  </svg>
);

const SpriteSkeleton: React.FC = () => (
  <svg viewBox="0 0 64 64" className="w-20 h-20 drop-shadow-md -mb-1" style={{ transform: 'scale(1)', transformOrigin: 'bottom center' }}>
     <rect x="24" y="46" width="4" height="12" fill="#e5e5e5" />
     <rect x="36" y="46" width="4" height="12" fill="#e5e5e5" />
     <rect x="22" y="28" width="20" height="18" fill="#e5e5e5" />
     <rect x="24" y="30" width="16" height="2" fill="#171717" />
     <rect x="24" y="34" width="16" height="2" fill="#171717" />
     <rect x="24" y="38" width="16" height="2" fill="#171717" />
     <rect x="18" y="30" width="4" height="14" fill="#e5e5e5" />
     <rect x="42" y="30" width="4" height="14" fill="#e5e5e5" />
     <rect x="24" y="14" width="16" height="14" rx="2" fill="#f5f5f5" />
     <rect x="27" y="20" width="4" height="4" fill="#000" />
     <rect x="33" y="20" width="4" height="4" fill="#000" />
     <rect x="44" y="24" width="2" height="20" fill="#713f12" transform="rotate(20 45 34)" />
  </svg>
);

const SpriteSheriff: React.FC = () => (
  <svg viewBox="0 0 64 64" className="w-24 h-24 drop-shadow-xl -mb-3" style={{ transform: 'scale(1)', transformOrigin: 'bottom center' }}>
     <rect x="22" y="45" width="8" height="14" fill="#1e3a8a" />
     <rect x="34" y="45" width="8" height="14" fill="#1e3a8a" />
     <rect x="20" y="25" width="24" height="22" fill="#2563eb" />
     <circle cx="32" cy="34" r="3" fill="#facc15" stroke="#b45309" /> 
     <rect x="24" y="14" width="16" height="12" fill="#fcd34d" />
     <rect x="26" y="18" width="2" height="2" fill="#000" />
     <rect x="36" y="18" width="2" height="2" fill="#000" />
     <rect x="30" y="22" width="6" height="2" fill="#92400e" />
     <rect x="20" y="12" width="24" height="4" fill="#78350f" />
     <rect x="24" y="6" width="16" height="6" fill="#78350f" />
  </svg>
);

const SpritePriest: React.FC = () => (
  <svg viewBox="0 0 64 64" className="w-20 h-20 drop-shadow-md -mb-2" style={{ transform: 'scale(1)', transformOrigin: 'bottom center' }}>
     <path d="M20 60 L44 60 L42 28 L22 28 Z" fill="#fefce8" /> 
     <rect x="22" y="30" width="20" height="4" fill="#fbbf24" opacity="0.8" />
     <rect x="30" y="34" width="4" height="26" fill="#fbbf24" opacity="0.6" />
     <rect x="24" y="16" width="16" height="14" fill="#fca5a5" />
     <rect x="26" y="20" width="2" height="2" fill="#000" />
     <rect x="36" y="20" width="2" height="2" fill="#000" />
     <path d="M22 16 L32 4 L42 16 Z" fill="#fefce8" stroke="#fbbf24" />
  </svg>
);

const SpriteNPC: React.FC<{ type: EntityType }> = ({ type }) => {
  let bodyColor = '#92400e'; 
  let detailColor = '#fcd34d';
  if (type === EntityType.NPC_MERCHANT) { bodyColor = '#7e22ce'; detailColor = '#a855f7'; } 
  if (type === EntityType.NPC_BANKER) { bodyColor = '#065f46'; detailColor = '#34d399'; } 
  if (type === EntityType.NPC_LOCKER) { bodyColor = '#374151'; detailColor = '#9ca3af'; } 

  return (
    <svg viewBox="0 0 64 64" className="w-20 h-20 drop-shadow-md -mb-2" style={{ transform: 'scale(1)', transformOrigin: 'bottom center' }}>
       <path d="M20 60 L44 60 L42 28 L22 28 Z" fill={bodyColor} />
       <rect x="22" y="30" width="20" height="4" fill={detailColor} opacity="0.3" />
       <rect x="24" y="16" width="16" height="14" fill="#fca5a5" />
       <rect x="26" y="20" width="2" height="2" fill="#000" />
       <rect x="36" y="20" width="2" height="2" fill="#000" />
       <rect x="22" y="14" width="20" height="4" fill={bodyColor} />
    </svg>
  );
};

const TreeSprite: React.FC = () => (
    <svg viewBox="0 0 100 140" className="absolute -top-[70px] -left-[18px] w-[100px] h-[140px] pointer-events-none z-20 filter drop-shadow-xl">
        <defs>
            <linearGradient id="trunkGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#451a03" />
                <stop offset="50%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
            <linearGradient id="leafGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#14532d" />
                <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
        </defs>
        <rect x="42" y="90" width="16" height="40" fill="url(#trunkGrad)" />
        <path d="M10 100 L50 40 L90 100 Z" fill="#166534" stroke="#064e3b" strokeWidth="1"/>
        <path d="M15 75 L50 25 L85 75 Z" fill="#15803d" stroke="#064e3b" strokeWidth="1"/>
        <path d="M25 50 L50 5 L75 50 Z" fill="#22c55e" stroke="#064e3b" strokeWidth="1"/>
    </svg>
);

const CustomTileSprite: React.FC<{ tile: CustomTile }> = ({ tile }) => (
    <div className="w-full h-full grid grid-cols-12 grid-rows-12 relative">
        {tile.pixels.map((color, idx) => (
             <div key={idx} style={{ backgroundColor: color }} />
        ))}
    </div>
);

export const Tile: React.FC<TileProps> = ({
  x,
  y,
  type,
  isHovered,
  isPath,
  pathIndex,
  pathColor,
  pathRotation = 0,
  hasEntity,
  entities = [],
  onClick,
  onDoubleClick,
  onContextMenu,
  onMouseEnter,
  isVisible,
  hasRoof,
  isReady = true,
  isHighlighted,
  doorOrientation,
  customTiles = []
}) => {
  if (!isVisible) return null;

  const left = x * TILE_SIZE;
  const top = y * TILE_SIZE;
  const baseZIndex = y * 30; 
  const isWall = type === TileType.WALL;
  const isDoor = type === TileType.DOOR;
  const isTree = type === TileType.TREE;
  const isVoid = type === TileType.VOID;

  const sortedEntities = [...entities].sort((a, b) => {
    const order = {
      [EntityType.ITEM_GOLD]: 0,
      [EntityType.ITEM_LOOT]: 0,
      [EntityType.FRIENDLY_VILLAGER]: 1,
      [EntityType.NPC]: 1,
      [EntityType.NPC_BANKER]: 1,
      [EntityType.NPC_MERCHANT]: 1,
      [EntityType.NPC_LOCKER]: 1,
      [EntityType.NPC_PRIEST]: 1,
      [EntityType.PLAYER]: 2,
      [EntityType.SHERIFF]: 2,
      [EntityType.ENEMY_SKELETON]: 3,
      [EntityType.ENEMY_ORC]: 3
    };
    return (order[a.type] || 0) - (order[b.type] || 0);
  });
  
  // Custom Tile Logic
  const customTile = type > 100 ? customTiles.find(ct => ct.id === type) : null;
  const bgStyle = customTile ? {} : { backgroundColor: isVoid ? '#000000' : COLORS[type] || '#000' };

  return (
    <div
      style={{ left: `${left}px`, top: `${top}px`, width: `${TILE_SIZE}px`, height: `${TILE_SIZE}px`, zIndex: baseZIndex }}
      className="absolute group"
      onContextMenu={onContextMenu}
    >
      <div
        className={`absolute bottom-0 left-0 w-full h-full transition-colors duration-75 cursor-pointer overflow-hidden`}
        style={{ zIndex: 0, ...bgStyle, boxShadow: isVoid ? 'none' : 'inset 0 0 5px rgba(0,0,0,0.2)' }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onMouseEnter={onMouseEnter}
      >
        {customTile && <CustomTileSprite tile={customTile} />}
        
        {!customTile && !isVoid && <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"></div>}
        
        {type === TileType.STONE_FLOOR && (
           <div className="absolute inset-0 opacity-20 border-2 border-gray-600/30">
               <div className="w-full h-1/2 border-b border-gray-600/30"></div>
               <div className="h-full w-1/2 border-r border-gray-600/30 absolute top-0 left-0"></div>
           </div>
        )}
        {type === TileType.WOOD_FLOOR && (
           <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(0deg,transparent,transparent_7px,#3f200b_7px,#3f200b_8px)]"></div>
        )}
        {isHovered && !isVoid && <div className="absolute inset-0 bg-white opacity-20 pointer-events-none"></div>}

        {isPath && pathColor && (
           <div 
             className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-40'}`}
             style={{ transform: `rotate(${pathRotation}deg)` }}
           >
             <svg viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${pathColor === 'green' ? 'text-green-500 drop-shadow-[0_1px_2px_rgba(34,197,94,0.8)]' : 'text-red-600 drop-shadow-[0_1px_2px_rgba(239,68,68,0.8)]'}`}>
               <path d="M14.8,19.2C13.6,18.3 13,17.6 13,16C13,14.4 14.6,12.8 16,11.2C16.9,10.1 18,8.9 18,7.5C18,5 16,3 13.5,3C11.6,3 10.1,4.1 9.4,5.8C9,6.7 9,7.5 9,7.5C9,7.5 7.5,6.8 7.5,5.2C7.5,4.6 7.6,4.1 7.8,3.6C6.2,4.2 5,5.7 5,7.5C5,10.2 7.8,12.2 9,14.5C9.9,16.1 10,18.2 9.2,19.2C8.6,19.9 8,21 8,21L11.5,21C11.5,21 11.5,20.5 11.8,20C12.2,19.3 12.8,19 13.5,19C14,19 14.5,19 14.8,19.2Z" />
             </svg>
           </div>
        )}
        {(type === TileType.STAIRS_DOWN || type === TileType.STAIRS_UP) && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center border-4 border-double border-stone-500">
                <div className="w-4/5 h-1 bg-stone-400 mb-1"></div>
                <div className="w-3/5 h-1 bg-stone-400 mb-1"></div>
                <div className="w-2/5 h-1 bg-stone-400"></div>
                <span className="text-[8px] text-white font-bold mt-1">{type === TileType.STAIRS_DOWN ? 'DOWN' : 'UP'}</span>
            </div>
        )}
      </div>

      {isWall && (
        <div className="pointer-events-none absolute bottom-0 left-0 w-full" style={{ height: '96px', zIndex: 10 }}>
            <div className="absolute bottom-0 left-0 w-full h-[64px] bg-stone-700 border-b-4 border-black/60 relative">
               <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_15px,#000_15px,#000_16px),repeating-linear-gradient(90deg,transparent,transparent_31px,#000_31px,#000_32px)]"></div>
            </div>
            <div className="absolute bottom-[64px] left-0 w-full h-[32px] bg-stone-600 border-t border-stone-400 relative">
                 <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,black_1px,transparent_1px)] bg-[length:4px_4px]"></div>
            </div>
        </div>
      )}

      {hasEntity && !isVoid && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 pointer-events-none" style={{ zIndex: 20 }}>
            {isHighlighted && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce z-50">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-yellow-400 drop-shadow-lg" fill="currentColor">
                        <path d="M12 2L12 16M12 16L8 12M12 16L16 12" stroke="currentColor" strokeWidth="4" />
                    </svg>
                </div>
            )}

            {sortedEntities.map((ent, idx) => {
              const eType = ent.type;
              const isLiving = eType !== EntityType.ITEM_GOLD && eType !== EntityType.ITEM_LOOT;
              const animDelay = `${((x * 10 + y * 5 + idx) * 0.4) % 3}s`;

              return (
              <div key={idx} className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex justify-center items-end w-24 h-24" style={{ zIndex: idx }}>
                 {idx === 0 && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-black/40 rounded-[100%] blur-[4px]"></div>}
                 
                 <div className={`w-full h-full flex justify-center items-end ${isLiving ? 'animate-idle origin-bottom' : ''}`} style={isLiving ? { animationDelay: animDelay } : {}}>
                     {eType === EntityType.PLAYER && ent.class === ClassType.WARRIOR && <SpriteKnight />}
                     {eType === EntityType.PLAYER && ent.class === ClassType.ROGUE && <SpriteRogue />}
                     {eType === EntityType.PLAYER && ent.class === ClassType.WIZARD && <SpriteWizard />}
                     {eType === EntityType.PLAYER && !ent.class && <SpriteKnight />}

                     {eType === EntityType.ENEMY_ORC && <SpriteOrc />}
                     {eType === EntityType.ENEMY_SKELETON && <SpriteSkeleton />}
                     {eType === EntityType.SHERIFF && <SpriteSheriff />}
                     
                     {(eType === EntityType.FRIENDLY_VILLAGER || eType === EntityType.NPC_BANKER || eType === EntityType.NPC_MERCHANT || eType === EntityType.NPC_LOCKER) && (
                        <SpriteNPC type={eType} />
                     )}
                     {eType === EntityType.NPC_PRIEST && <SpritePriest />}

                     {eType === EntityType.ITEM_GOLD && (
                      <div className="relative w-10 h-6 -mb-1 z-0 animate-pulse">
                          <div className="absolute bottom-0 left-0 w-4 h-3 bg-yellow-400 rounded-[50%] border border-yellow-700 shadow-sm z-0"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-3 bg-yellow-500 rounded-[50%] border border-yellow-700 shadow-sm z-0"></div>
                          <div className="absolute bottom-2 left-2 w-4 h-3 bg-yellow-300 rounded-[50%] border border-yellow-600 shadow-sm z-10"></div>
                      </div>
                     )}

                     {eType === EntityType.ITEM_LOOT && (
                      <div className="relative w-8 h-8 -mb-1 z-0">
                          <div className="w-full h-full bg-amber-800 rounded-full border-2 border-amber-950 flex items-center justify-center shadow-lg">
                              <span className="text-amber-200 text-xs font-bold">$</span>
                          </div>
                      </div>
                     )}
                     
                     {eType === EntityType.PLAYER && (
                         <div className="absolute -top-4 w-32 text-center pointer-events-none">
                             <span className="text-[10px] bg-black/60 text-white px-1 rounded">{ent.name}</span>
                         </div>
                     )}
                 </div>
              </div>
            )})}
        </div>
      )}

      {isTree && <div style={{zIndex: 25, position: 'relative'}}><TreeSprite /></div>}
      {isDoor && (
        <div className="absolute bottom-0 left-0 w-full pointer-events-none" style={{ zIndex: 25, height: '96px' }}>
           {doorOrientation === 'side' ? (
                <>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2/3 bg-black/40 blur-sm"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-[80px] bg-stone-800 border-r border-black/50"></div>
                    <div className="absolute top-[32px] left-0 w-full h-4 bg-stone-700 border-b border-black/30"></div>
                </>
           ) : (
                <>
                   <div className="absolute bottom-0 left-0 w-4 h-full bg-stone-800 border-r border-black/50"></div>
                   <div className="absolute bottom-0 right-0 w-4 h-full bg-stone-800 border-l border-black/50"></div>
                   <div className="absolute top-0 left-0 w-full h-8 bg-stone-700 border-b-4 border-black/30 shadow-lg z-10 flex items-center justify-center">
                       <div className="w-1/2 h-4 bg-black/40 rounded-b-lg"></div>
                   </div>
                   <div className="absolute bottom-0 left-4 right-4 h-2/3 bg-yellow-500/10 blur-sm animate-pulse border-b-2 border-yellow-500/30"></div>
               </>
           )}
           <div className="absolute bottom-[96px] left-0 w-full h-[24px] bg-stone-600 border-t border-stone-400 transform origin-bottom"></div>
        </div>
      )}
      {hasRoof && !isVoid && (
        <div
          className={`absolute -top-[56px] -left-[4px] w-[calc(100%+8px)] h-[calc(100%+56px)] transition-all duration-500 pointer-events-none`}
          style={{ zIndex: 28, transform: 'scale(1.05)', filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.5))' }}
        >
             <div className="w-full h-full bg-[#5c2e2e] border-t-4 border-red-900/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_14px,#00000030_14px,#00000030_16px)]"></div>
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,#00000010_10px,#00000010_12px)]"></div>
             </div>
             <div className="absolute -top-2 left-0 w-full h-4 bg-[#3f1d1d] border-b border-black/50"></div>
        </div>
      )}
    </div>
  );
};
