
import React, { useState } from 'react';
import { GameConfig, SkillType, ClassType, TileType, CustomTile, SkillLevelData } from '../types';
import { COLORS } from '../constants';

interface DeveloperPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: GameConfig;
  onUpdateConfig: (newConfig: GameConfig) => void;
  isMapEditMode: boolean;
  onToggleMapEdit: (enabled: boolean) => void;
  selectedTileType: number; // can be custom
  onSelectTileType: (type: number) => void;
  currentMapId: string;
  availableMapIds: string[];
  onChangeMap: (id: string) => void;
  editRoofs: boolean;
  onToggleEditRoofs: (enabled: boolean) => void;
}

const PixelEditor: React.FC<{ onSave: (tile: CustomTile) => void }> = ({ onSave }) => {
    const [name, setName] = useState('New Tile');
    const [pixels, setPixels] = useState<string[]>(Array(144).fill('#ffffff')); // 12x12
    const [selectedColor, setSelectedColor] = useState('#000000');

    const handlePixelClick = (idx: number) => {
        const newPixels = [...pixels];
        newPixels[idx] = selectedColor;
        setPixels(newPixels);
    };

    const handleSave = () => {
        const newTile: CustomTile = {
            id: 100 + Date.now() % 100000, 
            name,
            pixels
        };
        onSave(newTile);
        alert(`Saved tile: ${name}`);
        setPixels(Array(144).fill('#ffffff'));
        setName('New Tile');
    };

    const presetColors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#888888', '#552200', '#1c1917', '#15803d'];

    return (
        <div className="bg-gray-800 p-4 border border-gray-600 rounded">
            <h4 className="font-bold mb-2 text-white">Tile Designer (12x12)</h4>
            <div className="flex gap-4 mb-4">
                <div className="grid grid-cols-12 w-48 h-48 border border-white">
                    {pixels.map((color, idx) => (
                        <div key={idx} style={{ backgroundColor: color }} onClick={() => handlePixelClick(idx)} className="cursor-pointer hover:opacity-80 border-[0.5px] border-gray-900/10"></div>
                    ))}
                </div>
                <div>
                     <label className="block text-xs text-gray-400 mb-1">Color Picker</label>
                     <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-full h-8 mb-2" />
                     <div className="grid grid-cols-4 gap-1 mb-4">
                         {presetColors.map(c => <div key={c} onClick={() => setSelectedColor(c)} style={{ backgroundColor: c }} className="w-6 h-6 border border-gray-500 cursor-pointer"></div>)}
                     </div>
                     <label className="block text-xs text-gray-400 mb-1">Tile Name</label>
                     <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="bg-black border border-gray-600 text-white p-1 text-xs w-full mb-2" />
                     <button onClick={handleSave} className="bg-green-700 text-white w-full py-1 rounded text-xs font-bold">SAVE TILE</button>
                </div>
            </div>
        </div>
    );
};

export const DeveloperPanel: React.FC<DeveloperPanelProps> = ({ 
    isOpen, onClose, config, onUpdateConfig,
    isMapEditMode, onToggleMapEdit, selectedTileType, onSelectTileType,
    currentMapId, availableMapIds, onChangeMap, editRoofs, onToggleEditRoofs
}) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'classes' | 'skills' | 'map' | 'tile_designer'>('general');
  const [selectedSkillForEdit, setSelectedSkillForEdit] = useState<SkillType>(SkillType.MARTIAL_ARTS);

  if (!isOpen) return null;

  const handleLogin = () => {
    if (password === 'yes') setIsAuthenticated(true);
    else alert('Wrong password');
  };

  const updateConfigValue = (field: keyof GameConfig, value: any) => {
      onUpdateConfig({ ...config, [field]: value });
  };

  const updateClassStat = (cls: ClassType, stat: string, val: number) => {
      const newStats = { ...config.classStats };
      // @ts-ignore
      newStats[cls] = { ...newStats[cls], [stat]: val };
      updateConfigValue('classStats', newStats);
  };
  
  const updateSkillLevelData = (skill: SkillType, levelIndex: number, field: keyof SkillLevelData, val: number) => {
      const newSkills = { ...config.skills };
      const newLevels = [...newSkills[skill].levels];
      // @ts-ignore
      newLevels[levelIndex] = { ...newLevels[levelIndex], [field]: val };
      newSkills[skill] = { ...newSkills[skill], levels: newLevels };
      updateConfigValue('skills', newSkills);
  };

  const handleSaveCustomTile = (tile: CustomTile) => {
      const newTiles = [...(config.customTiles || []), tile];
      onUpdateConfig({ ...config, customTiles: newTiles });
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded border border-gray-600">
          <h2 className="text-xl font-bold mb-4 text-white">Developer Mode</h2>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-black text-white p-2 border border-gray-500 mb-4" placeholder="Password" />
          <div className="flex gap-2">
              <button onClick={handleLogin} className="bg-green-700 px-4 py-2 text-white font-bold">Enter</button>
              <button onClick={onClose} className="bg-red-700 px-4 py-2 text-white font-bold">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/90 z-[90] p-8 overflow-y-auto text-gray-200 font-mono">
      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
        <h2 className="text-3xl font-bold text-yellow-500">Developer Configuration</h2>
        <button onClick={onClose} className="bg-red-700 px-4 py-2 rounded font-bold text-white hover:bg-red-600">CLOSE</button>
      </div>

      <div className="flex gap-4 mb-6">
        {(['general', 'classes', 'skills', 'map', 'tile_designer'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 uppercase font-bold ${activeTab === tab ? 'bg-yellow-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {tab.replace('_', ' ')}
            </button>
        ))}
      </div>

      <div className="bg-gray-900 p-6 rounded border border-gray-700">
        {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-bold mb-4 text-white border-b border-gray-700">Game Speed</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-400 mb-1">Turn Duration (ms)</label>
                            <input type="number" value={config.turnDuration} onChange={(e) => updateConfigValue('turnDuration', parseInt(e.target.value))} className="bg-black p-2 border border-gray-600 w-full" />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">Player Cooldown (Turns)</label>
                            <input type="number" value={config.playerSpeed} onChange={(e) => updateConfigValue('playerSpeed', parseInt(e.target.value))} className="bg-black p-2 border border-gray-600 w-full" />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">NPC Speed (Turns/Action)</label>
                            <input type="number" value={config.npcSpeed} onChange={(e) => updateConfigValue('npcSpeed', parseInt(e.target.value))} className="bg-black p-2 border border-gray-600 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'classes' && (
             <div className="grid grid-cols-3 gap-4">
                 {Object.values(ClassType).map(cls => (
                     <div key={cls} className="bg-gray-800 p-4 rounded border border-gray-600">
                         <h4 className="font-bold text-lg mb-2 text-yellow-500">{cls}</h4>
                         {Object.keys(config.classStats[cls]).map(stat => (
                             <div key={stat} className="flex justify-between items-center mb-1">
                                 <label className="uppercase text-xs text-gray-400">{stat}</label>
                                 <input 
                                    type="number" 
                                    // @ts-ignore
                                    value={config.classStats[cls][stat]} 
                                    onChange={(e) => updateClassStat(cls, stat, parseInt(e.target.value))}
                                    className="w-16 bg-black border border-gray-600 p-1 text-right text-sm"
                                 />
                             </div>
                         ))}
                     </div>
                 ))}
             </div>
        )}
        
        {activeTab === 'skills' && (
             <div>
                 <div className="flex gap-2 mb-4">
                     {Object.values(SkillType).map(sk => (
                         <button 
                            key={sk} 
                            onClick={() => setSelectedSkillForEdit(sk)}
                            className={`px-3 py-1 text-xs uppercase font-bold border ${selectedSkillForEdit === sk ? 'bg-blue-900 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}
                         >
                             {sk.replace('_', ' ')}
                         </button>
                     ))}
                 </div>
                 <div className="overflow-x-auto max-h-[500px]">
                     <table className="w-full text-xs text-left">
                         <thead className="sticky top-0 z-10">
                             <tr className="bg-gray-800 text-gray-400">
                                 <th className="p-2">Lvl</th>
                                 <th className="p-2">XP Req</th>
                                 <th className="p-2">Dmg Bonus</th>
                                 <th className="p-2">Hit %</th>
                                 <th className="p-2">Block %</th>
                             </tr>
                         </thead>
                         <tbody>
                             {config.skills[selectedSkillForEdit].levels.map((lvlData, idx) => (
                                 <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                                     <td className="p-2 text-gray-500 font-bold">{lvlData.level}</td>
                                     <td className="p-2"><input type="number" value={lvlData.xpRequired} onChange={(e) => updateSkillLevelData(selectedSkillForEdit, idx, 'xpRequired', parseInt(e.target.value))} className="bg-black border border-gray-700 w-20 px-1 text-right" /></td>
                                     <td className="p-2"><input type="number" value={lvlData.damageBonus} onChange={(e) => updateSkillLevelData(selectedSkillForEdit, idx, 'damageBonus', parseInt(e.target.value))} className="bg-black border border-gray-700 w-16 px-1 text-right" /></td>
                                     <td className="p-2"><input type="number" step="0.01" value={lvlData.hitChance} onChange={(e) => updateSkillLevelData(selectedSkillForEdit, idx, 'hitChance', parseFloat(e.target.value))} className="bg-black border border-gray-700 w-16 px-1 text-right" /></td>
                                     <td className="p-2"><input type="number" step="0.01" value={lvlData.blockChance} onChange={(e) => updateSkillLevelData(selectedSkillForEdit, idx, 'blockChance', parseFloat(e.target.value))} className="bg-black border border-gray-700 w-16 px-1 text-right" /></td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        )}

        {activeTab === 'map' && (
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center bg-gray-800 p-4 rounded border border-gray-600">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={isMapEditMode} onChange={(e) => onToggleMapEdit(e.target.checked)} className="w-6 h-6" />
                            <span className={`font-bold ${isMapEditMode ? 'text-green-400' : 'text-gray-400'}`}>ENABLE MAP EDITOR</span>
                        </label>
                        {isMapEditMode && (
                             <label className="flex items-center gap-2 cursor-pointer ml-8">
                                <input type="checkbox" checked={editRoofs} onChange={(e) => onToggleEditRoofs(e.target.checked)} className="w-5 h-5" />
                                <span className="text-sm font-bold text-orange-300">EDIT ROOFS LAYER</span>
                            </label>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Current Map:</span>
                        <select value={currentMapId} onChange={(e) => onChangeMap(e.target.value)} className="bg-black border border-gray-600 p-1 text-sm rounded">
                            {availableMapIds.map(id => <option key={id} value={id}>{id}</option>)}
                        </select>
                    </div>
                </div>

                {isMapEditMode && (
                    <div className="bg-gray-800 p-4 rounded border border-gray-600">
                        <h4 className="font-bold mb-2 text-gray-300">Tile Palette</h4>
                        <div className="flex flex-wrap gap-2">
                            {/* Standard Tiles */}
                            {Object.entries(TileType).filter(([k,v]) => isNaN(Number(k))).map(([key, value]) => (
                                <button 
                                    key={key} 
                                    onClick={() => onSelectTileType(value as number)}
                                    className={`px-3 py-1 text-xs border ${selectedTileType === value ? 'border-yellow-500 bg-yellow-900' : 'border-gray-600 bg-gray-700'}`}
                                >
                                    {key}
                                </button>
                            ))}
                            {/* Custom Tiles */}
                            {config.customTiles?.map(tile => (
                                <button
                                    key={tile.id}
                                    onClick={() => onSelectTileType(tile.id)}
                                    className={`px-3 py-1 text-xs border flex items-center gap-2 ${selectedTileType === tile.id ? 'border-yellow-500 bg-yellow-900' : 'border-gray-600 bg-gray-700'}`}
                                >
                                    <div className="w-3 h-3 bg-white" style={{ backgroundColor: tile.pixels[0] }}></div>
                                    {tile.name}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 text-xs text-gray-400">
                            {editRoofs 
                              ? "Click map tiles to toggle ROOF (Visible/Invisible)." 
                              : "Click map tiles to paint the selected Ground/Wall type."
                            }
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'tile_designer' && (
             <PixelEditor onSave={handleSaveCustomTile} />
        )}

      </div>
    </div>
  );
};
