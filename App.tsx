
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tile } from './components/Tile';
import { UIOverlay } from './components/UIOverlay';
import { DeveloperPanel } from './components/DeveloperPanel';
import { AuthScreen } from './components/AuthScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { ChatInput } from './components/ChatInput';
import { MockBackend } from './services/mockBackend';
import { SoundService } from './services/soundService';
import { 
  GameMap, Entity, EntityType, MapId, Coordinate, ChatMessage, TileType, Item, EquipmentSlot, ItemType, ClassType, Stats, SkillType, WeaponType, GameConfig, SkillLevelData, AppState, User, Skill
} from './types';
import { 
  VIEWPORT_WIDTH, VIEWPORT_HEIGHT, TILE_SIZE,
  generateLoot, MERCHANT_ITEMS, RESPAWN_TIME_TURNS, HEALING_TONIC,
  INITIAL_SKILLS, DEFAULT_CONFIG, generateDefaultWorld
} from './constants';
import { generateFlavorText } from './services/geminiService';

const findPath = (start: Coordinate, end: Coordinate, map: GameMap): Coordinate[] => {
  const queue: Coordinate[][] = [[start]];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  let iterations = 0;
  while (queue.length > 0 && iterations < 3000) {
    iterations++;
    const path = queue.shift()!;
    const pos = path[path.length - 1];

    if (pos.x === end.x && pos.y === end.y) {
      return path.slice(1); 
    }

    const directions = [
      [0, 1], [1, 0], [0, -1], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];

    for (const [dx, dy] of directions) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;

      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      
      const tile = map.tiles[nx][ny];

      const isWalkable = 
        tile === TileType.GRASS || 
        tile === TileType.DIRT || 
        tile === TileType.STONE_FLOOR || 
        tile === TileType.WOOD_FLOOR ||
        tile === TileType.DOOR ||
        tile === TileType.STAIRS_DOWN ||
        tile === TileType.STAIRS_UP ||
        tile === TileType.TREE; 

      if (!isWalkable) continue;

      const key = `${nx},${ny}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([...path, { x: nx, y: ny }]);
      }
    }
  }
  return [];
};

const App: React.FC = () => {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  
  // Load Config (and custom tiles) from DB on start
  useEffect(() => {
     MockBackend.getConfig().then(cfg => {
         setConfig(cfg);
     });
  }, []);

  // Save Config when it changes
  useEffect(() => {
     if (config !== DEFAULT_CONFIG) {
         MockBackend.saveConfig(config);
     }
  }, [config]);

  const [showDevPanel, setShowDevPanel] = useState(false);
  const [isMapEditMode, setIsMapEditMode] = useState(false);
  const [editRoofs, setEditRoofs] = useState(false);
  const [selectedTileType, setSelectedTileType] = useState<number>(TileType.GRASS);

  const [appState, setAppState] = useState<AppState>('AUTH');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [maps, setMaps] = useState<Record<string, GameMap>>({});
  
  // Load world data once logged in/playing
  useEffect(() => {
     if (appState === 'GAME') {
        MockBackend.getWorldState().then(savedWorld => {
            setMaps(savedWorld);
        });
     }
  }, [appState]);

  const [currentMapId, setCurrentMapId] = useState<string>(MapId.TOWN);
  const currentMap = maps[currentMapId];

  const [creationName, setCreationName] = useState('Hero');
  const [creationClass, setCreationClass] = useState<ClassType>(ClassType.WARRIOR);
  const [creationStats, setCreationStats] = useState<Stats>({ ...DEFAULT_CONFIG.classStats[ClassType.WARRIOR] });
  const [creationPoints, setCreationPoints] = useState(5);

  const [player, setPlayer] = useState<Entity>({
    id: 'p1', type: EntityType.PLAYER, pos: {x:0,y:0}, hp: 100, maxHp: 100, name: 'Hero', gold: 50, bankGold: 0, level: 1, xp: 0, maxXp: config.playerLevels[0].xpRequired, class: ClassType.WARRIOR, stats: { str: 10, dex: 10, con: 10, int: 10 }, statPoints: 0, skills: JSON.parse(JSON.stringify(INITIAL_SKILLS)), inventory: [], locker: [], equipment: { mainHand: null, offHand: null, head: null, chest: null, gloves: null, boots: null, rings: Array(10).fill(null) }, activeEffects: []
  });

  const [entities, setEntities] = useState<Entity[]>([]);
  const [ghosts, setGhosts] = useState<Entity[]>([]); 
  const [deadEntities, setDeadEntities] = useState<Entity[]>([]); 
  const [items, setItems] = useState<Entity[]>([]);
  
  const [turn, setTurn] = useState(0);
  const [lastActionTurn, setLastActionTurn] = useState(-config.playerSpeed);
  const [selectedPath, setSelectedPath] = useState<Coordinate[]>([]);
  const [hoveredTile, setHoveredTile] = useState<Coordinate | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [target, setTarget] = useState<Entity | null>(null);
  const [highlightedEntityId, setHighlightedEntityId] = useState<string | null>(null);
  
  const [merchantTab, setMerchantTab] = useState<'buy' | 'sell'>('buy');
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [charSheetTab, setCharSheetTab] = useState<'stats' | 'skills'>('stats');
  const [showGroundLoot, setShowGroundLoot] = useState(false);
  const [activeTownService, setActiveTownService] = useState<'bank' | 'merchant' | 'locker' | null>(null);

  // Tooltip State
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Update mouse position for tooltip
  const handleMouseMove = (e: React.MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
  };

  // PERIODIC WORLD SAVE & GHOST UPDATE & HEARTBEAT
  useEffect(() => {
     if (appState === 'GAME' && currentUser) {
         const interval = setInterval(async () => {
             // 1. Heartbeat
             MockBackend.heartbeat(currentUser.username);

             // 2. Save World
             setMaps(prev => {
                 const updated = { ...prev };
                 if (updated[currentMapId]) {
                     const nonPlayerEntities = entities.filter(e => e.type !== EntityType.PLAYER);
                     const worldItems = items.map(i => i);
                     updated[currentMapId].initialEntities = [...nonPlayerEntities, ...worldItems];
                 }
                 MockBackend.saveWorldState(updated);
                 return updated;
             });

             // 3. Save Player & Get Ghosts
             if (player && player.id) {
                 await MockBackend.saveCharacterProgress(currentUser.username, { ...player, pos: player.pos });
                 const others = await MockBackend.getGhosts(currentMapId, player.id);
                 setGhosts(others);
             }

         }, 2000); 
         return () => clearInterval(interval);
     }
  }, [appState, currentMapId, entities, items, player, currentUser]);

  useEffect(() => {
      if (appState === 'GAME' && currentUser && player.id) {
          MockBackend.saveCharacterProgress(currentUser.username, player);
      }
  }, [turn, appState, currentUser, player]);

  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (sender: string, text: string, type: ChatMessage['type'] = 'system') => {
    setMessages(prev => [...prev.slice(-49), { sender, text, type }]);
  };

  const handleGlobalChat = async (text: string) => {
      if (currentUser) {
          await MockBackend.sendLobbyMessage(currentUser.username, text);
          // Also show locally immediately
          addMessage(currentUser.username, text, 'global');
      }
  };

  // Poll Global Chat in Game
  useEffect(() => {
      if (appState === 'GAME') {
          const interval = setInterval(async () => {
              const msgs = await MockBackend.getLobbyMessages();
              // Messages handled by lobby generally, but game integration could be here
          }, 2000);
          return () => clearInterval(interval);
      }
  }, [appState]);

  const getSkillConfig = (type: SkillType, level: number): SkillLevelData => {
      const safeLevel = Math.max(1, Math.min(level, config.skills[type].levels.length));
      return config.skills[type].levels[safeLevel - 1];
  };

  const getPlayerLevelConfig = (level: number) => {
      const safeLevel = Math.max(1, Math.min(level, config.playerLevels.length));
      return config.playerLevels[safeLevel - 1];
  };

  const calculateTotalStats = (ent: Entity) => {
    const baseStr = ent.stats?.str || 0;
    const baseDex = ent.stats?.dex || 0;
    let damage = baseStr;
    let armor = baseDex;
    
    const eq = ent.equipment;
    if (eq) {
      if (eq.mainHand) damage += (eq.mainHand.damage || 0);
      if (eq.offHand) armor += (eq.offHand.armor || 0);
      if (eq.head) armor += (eq.head.armor || 0);
      if (eq.chest) armor += (eq.chest.armor || 0);
      if (eq.gloves) armor += (eq.gloves.armor || 0);
      if (eq.boots) armor += (eq.boots.armor || 0);
      eq.rings.forEach(r => {
        if (r) {
          damage += (r.damage || 0);
          armor += (r.armor || 0);
        }
      });
    }
    return { damage, armor };
  };

  const getActiveSkillType = (ent: Entity): SkillType => {
      const weapon = ent.equipment?.mainHand;
      if (!weapon) return SkillType.MARTIAL_ARTS;
      if (weapon.weaponType === WeaponType.BOW) return SkillType.BOW;
      if (weapon.weaponType === WeaponType.STAFF) return SkillType.MAGIC;
      if (weapon.weaponType === WeaponType.SWORD || weapon.weaponType === WeaponType.DAGGER || weapon.weaponType === WeaponType.MACE) return SkillType.SWORD;
      return SkillType.MARTIAL_ARTS; 
  };

  const handleLevelUp = (newXp: number, currentLevel: number) => {
    let lvl = currentLevel;
    let xp = newXp;
    let gainedLevels = 0;
    let nextReq = getPlayerLevelConfig(lvl).xpRequired;

    while(xp >= nextReq && lvl < config.playerLevels.length) {
      const lvlConfig = getPlayerLevelConfig(lvl);
      lvl++;
      gainedLevels++;
      setPlayer(prev => ({
          ...prev,
          statPoints: prev.statPoints + lvlConfig.statPointsGain,
          maxHp: prev.maxHp + lvlConfig.hpGain,
          hp: prev.hp + lvlConfig.hpGain 
      }));
      nextReq = getPlayerLevelConfig(lvl).xpRequired;
    }
    
    if (gainedLevels > 0) {
        addMessage('Level Up', `You reached Level ${lvl}!`, 'level');
        SoundService.playLevelUp();
    }
    const maxForNext = getPlayerLevelConfig(lvl).xpRequired;
    return { level: lvl, xp, maxXp: maxForNext };
  };

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setAppState('LOBBY');
  };

  const handlePlayCharacter = async (charId: string) => {
      if (!currentUser) return;
      const char = await MockBackend.loadCharacter(currentUser.username, charId);
      if (char) {
          setPlayer(char);
          setAppState('GAME');
          addMessage('Narrator', "Welcome back to the Legends of Gemini.", 'ai');
          SoundService.init();
      }
  };

  const handleStartCreation = () => {
      setCreationName('Hero');
      setCreationClass(ClassType.WARRIOR);
      setCreationStats({ ...config.classStats[ClassType.WARRIOR] }); 
      setCreationPoints(5);
      setAppState('CREATION');
  };

  const handleFinishCreation = async () => {
      const maxHp = 20 + (1 * 5) + (creationStats.con * 5);
      const starterEq = { mainHand: null, offHand: null, head: null, chest: null, gloves: null, boots: null, rings: Array(10).fill(null) } as any;
      const starterInv = [...player.inventory || []];

      if (creationClass === ClassType.WARRIOR) {
          starterEq.mainHand = { id: 'start_sword', name: 'Rusty Sword', type: ItemType.EQUIPMENT, slot: EquipmentSlot.MAIN_HAND, weaponType: WeaponType.SWORD, damage: 3, value: 10, icon: '⚔️' };
          starterEq.chest = { id: 'start_chest', name: 'Tattered Tunice', type: ItemType.EQUIPMENT, slot: EquipmentSlot.CHEST, armor: 2, value: 10, icon: '🧥' };
      } else if (creationClass === ClassType.ROGUE) {
          starterEq.mainHand = { id: 'start_dagger', name: 'Dagger', type: ItemType.EQUIPMENT, slot: EquipmentSlot.MAIN_HAND, weaponType: WeaponType.DAGGER, damage: 2, value: 10, icon: '🗡️' };
          starterEq.chest = { id: 'start_leather', name: 'Leather Vest', type: ItemType.EQUIPMENT, slot: EquipmentSlot.CHEST, armor: 1, value: 10, icon: '🧥' };
      } else {
          starterEq.mainHand = { id: 'start_staff', name: 'Walking Staff', type: ItemType.EQUIPMENT, slot: EquipmentSlot.MAIN_HAND, weaponType: WeaponType.STAFF, damage: 2, value: 10, icon: '🦯' };
          starterInv.push({ ...HEALING_TONIC, id: 'start_tonic' });
      }

      const defaultStartPos = {x: 75, y: 80}; 

      const newChar: Entity = {
          ...player,
          id: `new_char`, 
          name: creationName || 'Hero',
          class: creationClass,
          stats: creationStats,
          statPoints: 0,
          maxHp: maxHp,
          hp: maxHp,
          pos: defaultStartPos, 
          equipment: starterEq,
          inventory: starterInv,
          maxXp: config.playerLevels[0].xpRequired,
          activeEffects: []
      };
      
      if (currentUser) {
          await MockBackend.createCharacter(currentUser.username, newChar);
          handlePlayCharacter(newChar.id);
          setAppState('LOBBY');
      }
  };

  const handleStatIncrease = (stat: keyof Stats) => {
      if (player.statPoints > 0) {
          setPlayer(prev => {
              const newStats = { ...prev.stats };
              newStats[stat]++;
              const newMaxHp = 20 + (prev.level * 5) + (newStats.con * 5);
              return { ...prev, stats: newStats, statPoints: prev.statPoints - 1, maxHp: newMaxHp, hp: prev.hp };
          });
      }
  };

  const handleCreationClassSelect = (c: ClassType) => {
      setCreationClass(c);
      setCreationStats({ ...config.classStats[c] });
      setCreationPoints(5); 
  };

  const handleCreationStatChange = (stat: keyof Stats, delta: number) => {
      if (delta > 0 && creationPoints > 0) {
          setCreationStats(prev => ({ ...prev, [stat]: prev[stat] + 1 }));
          setCreationPoints(p => p - 1);
      } else if (delta < 0) {
          const base = config.classStats[creationClass][stat];
          if (creationStats[stat] > base) {
              setCreationStats(prev => ({ ...prev, [stat]: prev[stat] - 1 }));
              setCreationPoints(p => p + 1);
          }
      }
  };

  const switchMap = useCallback((targetMapId: string, targetPos: Coordinate) => {
      setMaps(prevMaps => {
          const updatedCurrentMap = { ...prevMaps[currentMapId], initialEntities: [...entities.filter(e => e.type !== EntityType.PLAYER), ...items] };
          return { ...prevMaps, [currentMapId]: updatedCurrentMap };
      });
      setCurrentMapId(targetMapId);
      setPlayer(p => ({ ...p, pos: targetPos }));
      setLastActionTurn(turn);
      setSelectedPath([]);
  }, [currentMapId, entities, items, turn]);

  const handleDevMapChange = (mapId: string) => {
      if (maps[mapId]) {
          switchMap(mapId, maps[mapId].startPos);
      }
  };

  useEffect(() => {
      if (appState !== 'GAME') return;
      const map = maps[currentMapId];
      if (map) {
          const mapEntities = map.initialEntities || [];
          const mapMobs = mapEntities.filter(e => e.type !== EntityType.ITEM_GOLD && e.type !== EntityType.ITEM_LOOT);
          const mapItems = mapEntities.filter(e => e.type === EntityType.ITEM_GOLD || e.type === EntityType.ITEM_LOOT);
          
          setEntities(mapMobs);
          setItems(mapItems);
          setTarget(null);
          setGhosts([]); 
          
          (async () => {
              let context = "";
              if (currentMapId === MapId.TOWN) context = "You return to the town square.";
              else if (currentMapId.includes('interior')) context = "You step inside the building.";
              else if (currentMapId === MapId.DUNGEON) context = "You descend into the darkness.";
              const flavor = await generateFlavorText(context);
              addMessage('Narrator', flavor, 'ai');
          })();
      }
  }, [currentMapId, appState, maps]);

  useEffect(() => {
    if (appState !== 'GAME') return;
    const interval = setInterval(() => {
      setTurn(t => t + 1);
      
      setPlayer(prev => {
          if (!prev.activeEffects || prev.activeEffects.length === 0) return prev;
          let healAmount = 0;
          const nextEffects = [];
          
          for (const effect of prev.activeEffects) {
              if (effect.type === 'HEAL') {
                  healAmount += effect.amountPerTurn;
                  if (effect.turnsRemaining > 1) {
                      nextEffects.push({ ...effect, turnsRemaining: effect.turnsRemaining - 1 });
                  }
              }
          }
          const newHp = Math.min(prev.maxHp, prev.hp + healAmount);
          return { ...prev, hp: newHp, activeEffects: nextEffects };
      });
      
    }, config.turnDuration); 
    return () => clearInterval(interval);
  }, [appState, config.turnDuration]);

  // --- AI LOGIC ---
  useEffect(() => {
    if (appState !== 'GAME') return;
    if (!currentMap) return;
    
    setDeadEntities(prevDead => {
        const readyToRespawn: Entity[] = [];
        const stillDead: Entity[] = [];
        prevDead.forEach(e => {
            if (e.respawnTurn && turn >= e.respawnTurn) {
                readyToRespawn.push({ ...e, hp: e.maxHp, pos: e.originalPos || e.pos }); 
            } else {
                stillDead.push(e);
            }
        });
        if (readyToRespawn.length > 0) setEntities(prev => [...prev, ...readyToRespawn]);
        return stillDead;
    });

    if (turn % config.npcSpeed === 0) {
        setEntities(prevEntities => {
            const nextEntities = [...prevEntities];

            // SHERIFF AI
            const sheriffIndex = nextEntities.findIndex(e => e.type === EntityType.SHERIFF);
            if (sheriffIndex !== -1) {
                const sheriff = nextEntities[sheriffIndex];
                const enemies = nextEntities.filter(e => e.type === EntityType.ENEMY_ORC || e.type === EntityType.ENEMY_SKELETON);
                let targetEnemy: Entity | null = null;
                let minDist = 999;
                for (const enemy of enemies) {
                    const d = Math.abs(enemy.pos.x - sheriff.pos.x) + Math.abs(enemy.pos.y - sheriff.pos.y);
                    if (d < minDist) { minDist = d; targetEnemy = enemy; }
                }
                if (targetEnemy && minDist < 12) {
                    if (minDist <= 2) { 
                         const dmg = 50; 
                         const tIdx = nextEntities.findIndex(e => e.id === targetEnemy!.id);
                         if (tIdx !== -1) {
                             nextEntities[tIdx] = { ...nextEntities[tIdx], hp: nextEntities[tIdx].hp - dmg };
                             addMessage('Sheriff', `Sheriff Lawman blasts ${targetEnemy.name} for ${dmg} damage!`, 'combat');
                             if (nextEntities[tIdx].hp <= 0) {
                                 setDeadEntities(prev => [...prev, { ...nextEntities[tIdx], respawnTurn: turn + RESPAWN_TIME_TURNS }]);
                                 const dropPos = nextEntities[tIdx].pos;
                                 setItems(prev => [...prev, { id: `loot_gold_${Date.now()}_sheriff`, type: EntityType.ITEM_GOLD, pos: dropPos, hp: 1, maxHp: 1, name: 'Gold', level: 1, xp: 0, maxXp: 0, stats: {str:0,dex:0,int:0,con:0}, statPoints: 0, gold: 5 }]);
                                 nextEntities.splice(tIdx, 1);
                             }
                         }
                    } else {
                        const dx = Math.sign(targetEnemy.pos.x - sheriff.pos.x);
                        const dy = Math.sign(targetEnemy.pos.y - sheriff.pos.y);
                         const newX = sheriff.pos.x + dx;
                         const newY = sheriff.pos.y + dy;
                         if (currentMap.tiles[newX][newY] !== TileType.WALL && currentMap.tiles[newX][newY] !== TileType.VOID) {
                             nextEntities[sheriffIndex] = { ...sheriff, pos: { x: newX, y: newY } };
                         }
                    }
                } else {
                    if (Math.random() > 0.5) {
                         const wanderX = Math.floor(Math.random() * 3) - 1;
                         const wanderY = Math.floor(Math.random() * 3) - 1;
                         const newX = sheriff.pos.x + wanderX;
                         const newY = sheriff.pos.y + wanderY;
                         if (currentMap.tiles[newX]?.[newY] !== TileType.WALL) {
                             nextEntities[sheriffIndex] = { ...sheriff, pos: { x: newX, y: newY } };
                         }
                    }
                }
            }

            // ENEMY AI
            return nextEntities.map(entity => {
                if (entity.type !== EntityType.ENEMY_ORC && entity.type !== EntityType.ENEMY_SKELETON) return entity;
                if (entity.hp <= 0) return entity; 

                const dx = Math.abs(entity.pos.x - player.pos.x);
                const dy = Math.abs(entity.pos.y - player.pos.y);
                
                if (dx <= 1 && dy <= 1) {
                    setTimeout(() => handleEnemyAttack(entity), 0); 
                    return entity;
                }
                
                if (dx < 10 || dy < 10) {
                     let newX = entity.pos.x + Math.sign(player.pos.x - entity.pos.x);
                     let newY = entity.pos.y + Math.sign(player.pos.y - entity.pos.y);
                     
                     if (currentMap.tiles[newX] && currentMap.tiles[newX][newY] !== undefined) {
                         const tile = currentMap.tiles[newX][newY];
                         const isWalkable = tile !== TileType.WALL && tile !== TileType.VOID && tile !== TileType.WATER;
                         if (isWalkable) {
                             return { ...entity, pos: { x: newX, y: newY } };
                         }
                     }
                     return entity;
                }
                
                if (Math.random() > 0.7) {
                    const rX = entity.pos.x + (Math.random()>0.5?1:-1);
                    const rY = entity.pos.y + (Math.random()>0.5?1:-1);
                    if (currentMap.tiles[rX] && currentMap.tiles[rX][rY] !== undefined && currentMap.tiles[rX][rY] !== TileType.WALL) {
                         return { ...entity, pos: { x: rX, y: rY } };
                    }
                }
                return entity;
            });
        });
    }
  }, [turn, appState, currentMap]); 

  const handleEnemyAttack = (enemy: Entity) => {
      setPlayer(prev => {
          const activeSkill = getActiveSkillType(prev);
          const skillLevel = prev.skills ? prev.skills[activeSkill].level : 1;
          const skillCfg = getSkillConfig(activeSkill, skillLevel);
          const isBlocked = Math.random() < skillCfg.blockChance;
          if (isBlocked) { addMessage('Combat', `You BLOCKED ${enemy.name}'s attack!`, 'combat'); return prev; }

          const stats = calculateTotalStats(prev);
          const enemyStats = calculateTotalStats(enemy);
          const rawDmg = enemyStats.damage - stats.armor;
          const dmg = Math.max(1, Math.floor(rawDmg / 2)); 
          const newHp = prev.hp - dmg;
          
          if (newHp <= 0) {
             addMessage('System', 'YOU DIED! Respawning in Town...', 'danger');
             
             setCurrentMapId(MapId.TOWN);
             setSelectedPath([]);
             return { 
                 ...prev, 
                 hp: prev.maxHp, 
                 pos: maps[MapId.TOWN]?.startPos || {x:75, y:80}, 
                 gold: Math.floor((prev.gold || 0) / 2),
                 activeEffects: [] 
             };
          } else {
             addMessage('Combat', `${enemy.name} hits you for ${dmg} damage!`, 'danger');
             return { ...prev, hp: newHp };
          }
      });
  };

  const handleAttack = (targetEntityId: string, isDistanceClosing = false) => {
    const targetEntity = entities.find(e => e.id === targetEntityId);
    if (!targetEntity) return;

    let skillType = getActiveSkillType(player);
    let isJumpKick = isDistanceClosing;
    if (skillType === SkillType.BOW || skillType === SkillType.MAGIC) {
        isJumpKick = false;
    }

    const skillData = player.skills ? player.skills[skillType] : { level: 1, xp: 0, nextLevelXp: 20 };
    const configData = getSkillConfig(skillType, skillData.level);

    if (Math.random() > configData.hitChance) {
        addMessage('Combat', `You MISSED ${targetEntity.name}!`, 'combat');
        setLastActionTurn(turn);
        return;
    }

    const stats = calculateTotalStats(player);
    const targetStats = calculateTotalStats(targetEntity);
    const isCrit = Math.random() < ((player.stats?.int || 0) * 0.01);

    const rawDmg = stats.damage + configData.damageBonus - targetStats.armor;
    let damage = Math.max(1, rawDmg + Math.floor(Math.random() * 3));
    if (isCrit) damage = Math.floor(damage * 1.5);
    if (isJumpKick) damage = Math.floor(damage * 1.5);

    let actionText = "";
    if (isJumpKick) {
        actionText = "You jumpkick";
    } else {
        if (skillType === SkillType.MARTIAL_ARTS) {
             const arts = ["You punch", "You kick", "You smack", "You body"];
             actionText = arts[Math.floor(Math.random() * arts.length)];
        } else if (skillType === SkillType.SWORD) {
             actionText = "You slash";
        } else if (skillType === SkillType.BOW) {
             actionText = "You shoot";
        } else if (skillType === SkillType.MAGIC) {
             actionText = "You blast";
        }
    }

    const newHp = Math.max(0, targetEntity.hp - damage);
    
    let newSkillData = { ...skillData };
    newSkillData.xp += 5; 
    if (newSkillData.xp >= configData.xpRequired) {
        newSkillData.level++;
        newSkillData.xp = 0; 
        const nextCfg = getSkillConfig(skillType, newSkillData.level);
        newSkillData.nextLevelXp = nextCfg.xpRequired;
        addMessage('Level Up', `Your ${skillType} skill reached Level ${newSkillData.level}!`, 'level');
        SoundService.playSkillUp();
    } else {
        newSkillData.nextLevelXp = configData.xpRequired;
    }

    setPlayer(p => ({ ...p, skills: { ...p.skills!, [skillType]: newSkillData } }));

    if (newHp === 0) {
      setEntities(prev => prev.filter(e => e.id !== targetEntity.id));
      setDeadEntities(prev => [...prev, { ...targetEntity, respawnTurn: turn + RESPAWN_TIME_TURNS }]);
      setTarget(null);
      
      let msg = `${actionText} ${targetEntity.name} for ${damage} damage!`;
      if (isCrit) msg = `CRITICAL STRIKE! ` + msg;
      addMessage('Combat', msg + " Died!", 'combat');
      
      const xpGain = (targetEntity.level || 1) * 20;
      const { level, xp, maxXp } = handleLevelUp(player.xp + xpGain, player.level);
      setPlayer(p => ({ ...p, xp, level, maxXp }));
      addMessage('System', `Gained ${xpGain} XP.`, 'system');

      const dropPos = targetEntity.pos;
      setItems(prev => [...prev, { id: `loot_gold_${Date.now()}`, type: EntityType.ITEM_GOLD, pos: dropPos, hp: 1, maxHp: 1, name: 'Gold', level: 1, xp: 0, maxXp: 0, stats: {str:0,dex:0,int:0,con:0}, statPoints: 0, gold: Math.floor(Math.random() * 20) + 5 }]);
      setItems(prev => [...prev, { id: `loot_item_${Date.now()}`, type: EntityType.ITEM_LOOT, pos: dropPos, hp: 1, maxHp: 1, name: 'Loot', level: 1, xp: 0, maxXp: 0, stats: {str:0,dex:0,int:0,con:0}, statPoints: 0, lootItem: generateLoot() }]);
    } else {
      setEntities(prev => prev.map(e => e.id === targetEntity.id ? { ...e, hp: newHp } : e));
      let msg = `${actionText} ${targetEntity.name} for ${damage} damage!`;
      if (isCrit) msg = `CRITICAL STRIKE! ` + msg;
      addMessage('Combat', msg, 'combat');
    }
    setLastActionTurn(turn);
  };

  const handleUseTonic = () => {
      const inv = [...(player.inventory || [])];
      const tonicIndex = inv.findIndex(i => i.type === ItemType.CONSUMABLE && i.healAmount);
      if (tonicIndex !== -1) {
          const tonic = inv[tonicIndex];
          const totalHeal = tonic.healAmount || 50;
          const durationTurns = 20; 
          const healPerTurn = Math.ceil(totalHeal / durationTurns);

          inv.splice(tonicIndex, 1);
          
          setPlayer(p => ({ 
              ...p, 
              inventory: inv,
              activeEffects: [
                  ...(p.activeEffects || []),
                  { id: `eff_${Date.now()}_${Math.random()}`, type: 'HEAL', amountPerTurn: healPerTurn, turnsRemaining: durationTurns, name: 'Healing Tonic' }
              ]
          }));
          addMessage('System', `You drink a healing tonic. Healing over time...`, 'system');
      } else {
          addMessage('System', 'No Healing Tonics in inventory!', 'system');
      }
  };

  const checkPortal = (x: number, y: number) => {
      const portal = currentMap.portals?.find(p => p.x === x && p.y === y);
      if (portal) {
          switchMap(portal.targetMapId, { x: portal.targetX, y: portal.targetY });
          return true;
      }
      return false;
  };

  const handleTileClick = (x: number, y: number) => {
    if (showCharacterSheet || showGroundLoot || activeTownService || showDevPanel) return;
    
    // MAP EDIT MODE
    if (isMapEditMode) {
        setMaps(prev => {
            const updatedMap = { ...prev[currentMapId] };
            
            if (editRoofs) {
                if (!updatedMap.roofs) updatedMap.roofs = Array(updatedMap.width).fill(0).map(() => Array(updatedMap.height).fill(0));
                updatedMap.roofs = updatedMap.roofs.map(row => [...row]);
                updatedMap.roofs[x][y] = updatedMap.roofs[x][y] === 1 ? 0 : 1; // Toggle roof
            } else {
                updatedMap.tiles = updatedMap.tiles.map(row => [...row]); 
                updatedMap.tiles[x][y] = selectedTileType;
            }
            
            MockBackend.saveWorldState({ ...prev, [currentMapId]: updatedMap });
            return { ...prev, [currentMapId]: updatedMap };
        });
        return;
    }

    if (turn - lastActionTurn < config.playerSpeed) {
      addMessage('System', `Resting...`, 'system');
      return;
    }
    
    let targetX = x;
    let targetY = y;
    if (currentMap.tiles[x][y] === TileType.WALL) {
        if (currentMap.tiles[x][y-1] === TileType.DOOR) targetY = y - 1; 
    }

    const clickedEntity = entities.find(e => e.pos.x === targetX && e.pos.y === targetY);
    if (clickedEntity) setTarget(clickedEntity);
    
    const path = findPath(player.pos, { x: targetX, y: targetY }, currentMap);
    if (path.length > 0) setSelectedPath(path);
    else setSelectedPath([]);
  };

  const handleTileDoubleClick = (rawX: number, rawY: number) => {
    if (showCharacterSheet || showGroundLoot || activeTownService || showDevPanel || isMapEditMode) return;
    if (turn - lastActionTurn < config.playerSpeed) return;

    let x = rawX;
    let y = rawY;
    if (currentMap.tiles[x][y] === TileType.WALL) {
        if (y > 0 && currentMap.tiles[x][y-1] === TileType.DOOR) y = y - 1;
    }

    const dx = Math.abs(player.pos.x - x);
    const dy = Math.abs(player.pos.y - y);
    const isAdjacent = dx <= 1 && dy <= 1 && !(dx===0 && dy===0);
    const isSelf = dx === 0 && dy === 0;
    
    const entityOnTile = entities.find(e => e.pos.x === x && e.pos.y === y);

    if (entityOnTile) {
      if (isAdjacent || isSelf) {
        if (entityOnTile.type === EntityType.NPC_BANKER) { setActiveTownService('bank'); return; }
        if (entityOnTile.type === EntityType.NPC_MERCHANT) { setActiveTownService('merchant'); return; }
        if (entityOnTile.type === EntityType.NPC_LOCKER) { setActiveTownService('locker'); return; }
        if (entityOnTile.type === EntityType.NPC_PRIEST) { setPlayer(p => ({ ...p, hp: p.maxHp })); addMessage('Priest', 'Blessings be upon you.', 'ai'); return; }
      }
    }

    if (entityOnTile && (entityOnTile.type === EntityType.ENEMY_ORC || entityOnTile.type === EntityType.ENEMY_SKELETON)) {
      const path = findPath(player.pos, {x, y}, currentMap);
      const activeSkill = getActiveSkillType(player);
      const skillRange = config.skills[activeSkill].range;
      
      const distToTarget = isSelf ? 0 : (path.length > 0 ? path.length : (isAdjacent ? 1 : 999));
      
      if (distToTarget <= skillRange) { 
          handleAttack(entityOnTile.id, false); 
          return; 
      }
      
      if (activeSkill !== SkillType.BOW && activeSkill !== SkillType.MAGIC) {
          const isStartOnTree = currentMap.tiles[player.pos.x][player.pos.y] === TileType.TREE;
          const maxMove = isStartOnTree ? 3 : 5;
          if (path.length > 0 && path.length <= maxMove) { 
              setPlayer(prev => ({ ...prev, pos: { x, y } }));
              handleAttack(entityOnTile.id, true); 
              return;
          }
      }
    }

    if (isSelf && target && (target.type === EntityType.ENEMY_ORC || target.type === EntityType.ENEMY_SKELETON)) {
       const tdx = Math.abs(player.pos.x - target.pos.x);
       const tdy = Math.abs(player.pos.y - target.pos.y);
       if (tdx <= 1 && tdy <= 1) { handleAttack(target.id, false); return; }
    }

    const isPortal = currentMap.portals?.some(p => p.x === x && p.y === y);
    let path = selectedPath;
    if (path.length === 0 || path[path.length - 1].x !== x || path[path.length - 1].y !== y) {
        path = findPath(player.pos, { x, y }, currentMap);
    }
    
    if (path.length > 0) {
         const targetNode = path[path.length - 1];
         if (targetNode.x === x && targetNode.y === y) {
             const isStartOnTree = currentMap.tiles[player.pos.x][player.pos.y] === TileType.TREE;
             const maxMove = isStartOnTree ? 3 : 5;
             const allowedDist = isPortal ? 15 : maxMove;

             if (path.length <= allowedDist) {
                if (isPortal) {
                    const portal = currentMap.portals?.find(p => p.x === x && p.y === y);
                    if (portal) { switchMap(portal.targetMapId, { x: portal.targetX, y: portal.targetY }); return; }
                }

                setPlayer(prev => ({ ...prev, pos: { x, y } }));
                if (checkPortal(x, y)) { } else { setLastActionTurn(turn); }
                setSelectedPath([]);
             } else {
                addMessage('System', 'Too far.', 'system');
             }
         }
    }
  };

  const handleTileRightClick = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    let targetX = x;
    let targetY = y;
    if (currentMap.tiles[x][y] === TileType.WALL && currentMap.tiles[x][y-1] === TileType.DOOR) targetY = y - 1;
    
    const clickedEntity = entities.find(e => e.pos.x === targetX && e.pos.y === targetY);
    
    if (clickedEntity && clickedEntity.type.startsWith('NPC')) {
        const dx = Math.abs(player.pos.x - targetX);
        const dy = Math.abs(player.pos.y - targetY);
        if (dx > 1 || dy > 1) { addMessage(clickedEntity.name, "Step up closer.", 'ai'); return; }

        if (clickedEntity.type === EntityType.NPC_MERCHANT) setActiveTownService('merchant');
        else if (clickedEntity.type === EntityType.NPC_BANKER) setActiveTownService('bank');
        else if (clickedEntity.type === EntityType.NPC_LOCKER) setActiveTownService('locker');
        else if (clickedEntity.type === EntityType.NPC_PRIEST) { setPlayer(p => ({ ...p, hp: p.maxHp })); addMessage('Priest', 'You are healed.', 'ai'); }
        return;
    }

    if (player.pos.x === x && player.pos.y === y) setShowGroundLoot(true);
  };

  const handleSidebarAttack = () => {
    if (!target) return;
    if (turn - lastActionTurn < config.playerSpeed) return;
    const freshTarget = entities.find(e => e.id === target.id);
    if (!freshTarget) return;
    
    const activeSkill = getActiveSkillType(player);
    const range = config.skills[activeSkill].range;
    const path = findPath(player.pos, freshTarget.pos, currentMap);
    if (path.length <= range) handleAttack(freshTarget.id, false);
    else addMessage('System', 'Target out of range.', 'system');
  };

  const handleEquip = (item: Item, idx: number) => { 
      if (item.type !== ItemType.EQUIPMENT || !player.equipment) return;
      const newEq = { ...player.equipment }; const newInv = [...(player.inventory || [])];
      newInv.splice(idx, 1);
      let unequipped: Item|null = null;
      if (item.slot === EquipmentSlot.RING) {
          const empty = newEq.rings.findIndex(r => r === null);
          if (empty !== -1) newEq.rings[empty] = item; else { unequipped = newEq.rings[0]; newEq.rings[0] = item; }
      } else { if (item.slot) { unequipped = newEq[item.slot] as Item|null; (newEq as any)[item.slot] = item; } }
      if (unequipped) newInv.push(unequipped);
      setPlayer(p => ({ ...p, equipment: newEq, inventory: newInv }));
  };
  const handleUnequip = (slot: EquipmentSlot, rIdx?: number) => {
      if (!player.equipment) return;
      const newEq = { ...player.equipment }; const newInv = [...(player.inventory || [])];
      let item: Item|null = null;
      if (slot === EquipmentSlot.RING && typeof rIdx === 'number') { item = newEq.rings[rIdx]; newEq.rings[rIdx] = null; }
      else if (slot !== EquipmentSlot.RING) { item = (newEq as any)[slot]; (newEq as any)[slot] = null; }
      if (item) { newInv.push(item); setPlayer(p => ({ ...p, equipment: newEq, inventory: newInv })); }
  };
  const getGroundItems = () => items.filter(i => i.pos.x === player.pos.x && i.pos.y === player.pos.y);
  const takeCoin = () => {
      const g = getGroundItems(); const coin = g.filter(i => i.type === EntityType.ITEM_GOLD);
      let t = 0; const rem = new Set<string>(); coin.forEach(i => { t += (i.gold || 0); rem.add(i.id); });
      if (t > 0) { setPlayer(p => ({ ...p, gold: (p.gold || 0) + t })); setItems(prev => prev.filter(i => !rem.has(i.id))); addMessage('Loot', `Picked up ${t} gold.`, 'loot'); }
  };
  const takeAll = () => {
      const g = getGroundItems(); let t = 0; const inv = [...(player.inventory || [])]; const rem = new Set<string>();
      g.forEach(i => { if (i.type === EntityType.ITEM_GOLD) { t += (i.gold || 0); rem.add(i.id); } else if (i.lootItem) { inv.push(i.lootItem); rem.add(i.id); } });
      if (t > 0 || rem.size > 0) { setPlayer(p => ({ ...p, gold: (p.gold || 0) + t, inventory: inv })); setItems(prev => prev.filter(i => !rem.has(i.id))); addMessage('Loot', `Picked up everything.`, 'loot'); setShowGroundLoot(false); }
  };
  const takeItem = (e: Entity) => {
      if (e.type === EntityType.ITEM_GOLD) { setPlayer(p => ({ ...p, gold: (p.gold || 0) + (e.gold || 0) })); addMessage('Loot', `Picked up ${e.gold} gold.`, 'loot'); }
      else if (e.lootItem) { setPlayer(p => ({ ...p, inventory: [...(p.inventory || []), e.lootItem!] })); addMessage('Loot', `Picked up ${e.lootItem.name}.`, 'loot'); }
      setItems(prev => prev.filter(i => i.id !== e.id));
  };
  const handleBank = (amount: number) => { 
      if (amount > 0 && (player.gold || 0) >= amount) setPlayer(p => ({ ...p, gold: (p.gold || 0) - amount, bankGold: (p.bankGold || 0) + amount }));
      else if (amount < 0 && (player.bankGold || 0) >= Math.abs(amount)) setPlayer(p => ({ ...p, gold: (p.gold || 0) + Math.abs(amount), bankGold: (p.bankGold || 0) - Math.abs(amount) }));
  };
  const handleSell = (idx: number) => {
      const inv = [...(player.inventory || [])]; const item = inv[idx]; inv.splice(idx, 1);
      setPlayer(p => ({ ...p, inventory: inv, gold: (p.gold || 0) + item.value })); addMessage('Merchant', `Sold ${item.name} for ${item.value}g`, 'loot');
  };
  const handleBuy = (item: Item) => {
      if ((player.gold || 0) >= item.value) { setPlayer(p => ({ ...p, gold: (p.gold || 0) - item.value, inventory: [...(p.inventory || []), { ...item, id: `bought_${Date.now()}` }] })); addMessage('Merchant', `Bought ${item.name}`, 'loot'); }
      else addMessage('Merchant', "Not enough gold!", 'system');
  };
  const handleLocker = (idx: number, fromInv: boolean) => {
      const inv = [...(player.inventory || [])]; const locker = [...(player.locker || [])];
      if (fromInv) { const item = inv[idx]; inv.splice(idx, 1); locker.push(item); }
      else { const item = locker[idx]; locker.splice(idx, 1); inv.push(item); }
      setPlayer(p => ({ ...p, inventory: inv, locker }));
  };

  const renderTiles = () => {
    if (!currentMap) return { tiles: [], visibleEntities: [] };

    const tiles = [];
    const buffer = 2; 
    const radiusX = Math.ceil(VIEWPORT_WIDTH / 2) + buffer;
    const radiusY = Math.ceil(VIEWPORT_HEIGHT / 2) + buffer;
    const minX = Math.max(0, player.pos.x - radiusX);
    const maxX = Math.min(currentMap.width - 1, player.pos.x + radiusX);
    const minY = Math.max(0, player.pos.y - radiusY);
    const maxY = Math.min(currentMap.height - 1, player.pos.y + radiusY);
    const isReady = turn - lastActionTurn >= config.playerSpeed;

    const visibleEntities = entities.filter(e => e.pos.x >= minX && e.pos.x <= maxX && e.pos.y >= minY && e.pos.y <= maxY && e.type !== EntityType.PLAYER);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tileType = currentMap.tiles[x][y];
        const hasRoof = currentMap.roofs ? currentMap.roofs[x][y] === 1 : false;
        
        const entitiesHere = entities.filter(e => e.pos.x === x && e.pos.y === y);
        const itemHere = items.find(i => i.pos.x === x && i.pos.y === y);
        const isPlayerHere = player.pos.x === x && player.pos.y === y;
        const ghostsHere = ghosts.filter(g => g.pos && g.pos.x === x && g.pos.y === y);
        
        const allEntitiesOnTile = [...entitiesHere];
        if (itemHere) allEntitiesOnTile.push(itemHere);
        if (isPlayerHere) allEntitiesOnTile.push(player);
        allEntitiesOnTile.push(...ghostsHere); // Add Ghosts

        const pathIndex = selectedPath.findIndex(p => p.x === x && p.y === y);
        const isPath = pathIndex !== -1;
        let pathColor: 'green' | 'red' | undefined = undefined;
        let pathRotation = 0;

        if (isPath) {
            const isStartOnTree = currentMap.tiles[player.pos.x][player.pos.y] === TileType.TREE;
            const maxMove = isStartOnTree ? 3 : 5;
            if ((pathIndex + 1) <= maxMove) pathColor = 'green'; else pathColor = 'red';

            const prevNode = pathIndex === 0 ? player.pos : selectedPath[pathIndex - 1];
            const currentNode = selectedPath[pathIndex];
            const dx = currentNode.x - prevNode.x;
            const dy = currentNode.y - prevNode.y;
            pathRotation = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
        }

        const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
        const isHighlighted = entitiesHere.some(e => e.id === highlightedEntityId);

        let doorOrientation: 'front' | 'side' | undefined;
        if (tileType === TileType.DOOR) {
             const left = currentMap.tiles[x - 1]?.[y] === TileType.WALL;
             const right = currentMap.tiles[x + 1]?.[y] === TileType.WALL;
             if (left || right) doorOrientation = 'front'; else doorOrientation = 'side';
        }

        tiles.push(
          <Tile
            key={`${x}-${y}`} x={x} y={y} type={tileType}
            isHovered={isHovered} isPath={isPath} pathIndex={pathIndex} pathColor={pathColor} pathRotation={pathRotation}
            hasEntity={allEntitiesOnTile.length > 0} 
            entities={allEntitiesOnTile} 
            isVisible={true} hasRoof={hasRoof} 
            isReady={isReady} isHighlighted={isHighlighted} doorOrientation={doorOrientation}
            customTiles={config.customTiles}
            onClick={() => handleTileClick(x, y)} onDoubleClick={() => handleTileDoubleClick(x, y)}
            onContextMenu={(e) => handleTileRightClick(e, x, y)} onMouseEnter={() => setHoveredTile({ x, y })}
          />
        );
      }
    }
    return { tiles, visibleEntities };
  };

  const VIEWPORT_WIDTH_PX = VIEWPORT_WIDTH * TILE_SIZE;
  const VIEWPORT_HEIGHT_PX = VIEWPORT_HEIGHT * TILE_SIZE;
  const translateX = (VIEWPORT_WIDTH_PX / 2) - (player.pos.x * TILE_SIZE + TILE_SIZE / 2);
  const translateY = (VIEWPORT_HEIGHT_PX / 2) - (player.pos.y * TILE_SIZE + TILE_SIZE / 2);

  const stats = calculateTotalStats(player);
  const groundItems = getGroundItems();
  const tonicCount = (player.inventory || []).filter(i => i.type === ItemType.CONSUMABLE && i.healAmount).length;
  
  if (appState === 'AUTH') {
      return <AuthScreen onLogin={handleLogin} />;
  }

  if (appState === 'LOBBY' && currentUser) {
      return <LobbyScreen user={currentUser} onPlay={handlePlayCharacter} onCreateNew={handleStartCreation} onLogout={() => setAppState('AUTH')} />;
  }

  if (appState === 'CREATION') {
      return (
        <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-4">
             <div className="w-[800px] border-4 border-gray-600 p-8 rounded bg-gray-900 shadow-2xl">
                  <h1 className="text-4xl text-center text-yellow-500 mb-8 font-bold tracking-widest uppercase text-shadow-lg">Character Creation</h1>
                  <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div><label className="block text-gray-400 mb-2 uppercase">Character Name</label><input type="text" value={creationName} onChange={(e) => setCreationName(e.target.value)} className="w-full bg-black border border-gray-500 p-2 text-xl text-white focus:border-yellow-500 outline-none"/></div>
                          <div><label className="block text-gray-400 mb-2 uppercase">Select Class</label>
                              <div className="space-y-2">{Object.values(ClassType).map(c => (<div key={c} onClick={() => handleCreationClassSelect(c)} className={`p-3 border cursor-pointer flex justify-between items-center transition-all ${creationClass === c ? 'border-yellow-500 bg-yellow-900/20' : 'border-gray-700 hover:border-gray-500'}`}><span className="font-bold">{c}</span></div>))}</div>
                          </div>
                      </div>
                      <div className="border border-gray-700 p-6 bg-black/40">
                          <h2 className="text-xl text-gray-300 border-b border-gray-700 pb-2 mb-4">Attributes</h2>
                          <div className="space-y-4">{(['str', 'dex', 'int', 'con'] as const).map(stat => (<div key={stat} className="flex justify-between items-center"><span className="uppercase text-gray-400 w-12 font-bold">{stat}</span><div className="flex items-center gap-4"><button onClick={() => handleCreationStatChange(stat, -1)} className="w-8 h-8 bg-gray-800 border border-gray-600 flex items-center justify-center text-red-500">-</button><span className="text-xl w-8 text-center">{creationStats[stat]}</span><button onClick={() => handleCreationStatChange(stat, 1)} className={`w-8 h-8 border flex items-center justify-center ${creationPoints > 0 ? 'bg-gray-800 border-gray-600 text-green-500' : 'bg-gray-900 border-gray-800 text-gray-700'}`}>+</button></div></div>))}</div>
                          <div className="mt-8 text-center"><div className="text-sm text-gray-500 uppercase">Points Remaining</div><div className={`text-4xl font-bold ${creationPoints > 0 ? 'text-green-500' : 'text-gray-600'}`}>{creationPoints}</div></div>
                      </div>
                  </div>
                  <div className="mt-8 flex justify-between">
                      <button onClick={() => setAppState('LOBBY')} className="px-8 py-4 text-xl font-bold uppercase border-2 bg-gray-800 border-gray-700 text-gray-400">Cancel</button>
                      <button onClick={handleFinishCreation} disabled={creationPoints > 0} className={`px-12 py-4 text-2xl font-bold uppercase tracking-widest border-2 transition-all ${creationPoints === 0 ? 'bg-yellow-700 border-yellow-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'}`}>Finish</button>
                  </div>
             </div>
        </div>
      );
  }

  const { tiles: renderedTiles, visibleEntities } = renderTiles();

  return (
    <div className="flex h-screen w-screen bg-gray-900 overflow-hidden text-gray-100 font-sans" onContextMenu={(e) => e.preventDefault()} onMouseMove={handleMouseMove}>
      <div className="absolute top-2 right-2 w-4 h-4 bg-gray-800/20 hover:bg-red-500 cursor-pointer z-[60] rounded-full border border-gray-700" onClick={() => setShowDevPanel(true)} title="Developer Mode"></div>
      <DeveloperPanel 
          isOpen={showDevPanel} 
          onClose={() => setShowDevPanel(false)} 
          config={config} 
          onUpdateConfig={setConfig} 
          isMapEditMode={isMapEditMode}
          onToggleMapEdit={setIsMapEditMode}
          selectedTileType={selectedTileType}
          onSelectTileType={setSelectedTileType}
          currentMapId={currentMapId}
          availableMapIds={Object.keys(maps)}
          onChangeMap={handleDevMapChange}
          editRoofs={editRoofs}
          onToggleEditRoofs={setEditRoofs}
      />

      {/* CHAT INPUT */}
      <ChatInput onSend={handleGlobalChat} />

      {/* ITEM TOOLTIP */}
      {hoveredItem && (
          <div className="fixed z-[70] pointer-events-none bg-black/95 border border-yellow-500 p-2 rounded shadow-2xl text-xs max-w-xs" style={{ top: mousePos.y + 10, left: mousePos.x + 10 }}>
             <div className="font-bold text-yellow-500 mb-1 text-sm border-b border-gray-700 pb-1">{hoveredItem.name}</div>
             <div className="text-gray-400 italic mb-1">{hoveredItem.type.replace('_', ' ')} {hoveredItem.weaponType ? `(${hoveredItem.weaponType})` : ''}</div>
             {hoveredItem.damage && <div className="text-red-300">Damage: +{hoveredItem.damage}</div>}
             {hoveredItem.armor && <div className="text-blue-300">Armor: +{hoveredItem.armor}</div>}
             {hoveredItem.healAmount && <div className="text-green-300">Heals: {hoveredItem.healAmount} over 10s</div>}
             {hoveredItem.stats && (
                 <div className="space-y-0.5">
                     {Object.entries(hoveredItem.stats).map(([k,v]) => (
                         // @ts-ignore
                         v > 0 && <div key={k} className="text-purple-300 uppercase">{k}: +{v}</div>
                     ))}
                 </div>
             )}
             <div className="text-yellow-600 mt-2 text-[10px] text-right">Value: {hoveredItem.value}g</div>
          </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center relative bg-black/50 border-r border-gray-800">
        <div className="relative bg-black overflow-hidden shadow-2xl border-4 border-gray-700 rounded" style={{ width: `${VIEWPORT_WIDTH_PX}px`, height: `${VIEWPORT_HEIGHT_PX}px` }}>
            <div className="absolute top-0 left-0 transition-transform duration-300 ease-in-out will-change-transform" style={{ transform: `translate3d(${translateX}px, ${translateY}px, 0)` }}>{renderedTiles}</div>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_50%,black_100%)] opacity-60"></div>
            <UIOverlay turn={turn} lastActionTurn={lastActionTurn} />
            <div className="absolute bottom-4 left-4 pointer-events-none max-w-sm space-y-1 opacity-60">
                {messages.slice(-4).map((msg, idx) => (
                    <div key={idx} className="text-xs bg-black/40 px-2 py-1 rounded text-shadow-sm font-bold"><span className={msg.type === 'danger' ? 'text-red-500' : msg.type === 'combat' ? 'text-orange-400' : msg.type === 'global' ? 'text-blue-300' : 'text-gray-300'}>{msg.type==='global' ? `${msg.sender}: ${msg.text}` : msg.text}</span></div>
                ))}
            </div>
            
            <div className="absolute top-4 right-4 flex flex-col gap-1 pointer-events-none">
                {player.activeEffects?.map(eff => (
                    <div key={eff.id} className="bg-green-900/80 text-green-300 text-[10px] px-2 py-1 rounded border border-green-700 animate-pulse">
                        {eff.name} ({eff.turnsRemaining}s)
                    </div>
                ))}
            </div>

            {/* MAP EDITOR INDICATOR */}
            {isMapEditMode && (
                <div className="absolute bottom-4 right-4 bg-red-900/80 border border-red-500 text-white px-3 py-1 font-bold animate-pulse z-50 pointer-events-none">
                    EDIT MODE ACTIVE {editRoofs ? '(ROOFS)' : '(GROUND)'}
                </div>
            )}
        </div>
        <div className="mt-4 flex gap-4">
             <div className="bg-gray-800 border-2 border-gray-600 rounded p-2 flex items-center gap-3 cursor-pointer hover:bg-gray-700 hover:border-gray-400 select-none" onClick={handleUseTonic} title="Use Healing Tonic">
                 <span className="text-2xl">🧪</span><div><div className="text-xs font-bold text-gray-300 uppercase">Tonic</div><div className="text-sm font-bold text-white">x{tonicCount}</div></div>
             </div>
        </div>
      </div>

      <div className="w-80 bg-gray-900 flex flex-col border-l border-gray-700 shadow-2xl z-20">
          <div className="p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex justify-between items-center mb-1">
                  <div><h2 className="text-xl font-bold text-yellow-500 leading-none">{player.name}</h2><span className="text-[10px] text-gray-400 uppercase">{player.class} - Lvl {player.level}</span></div>
                  {player.statPoints > 0 && <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded border border-green-700 animate-pulse">Points!</span>}
              </div>
              <div className="w-full bg-gray-900 h-4 rounded-full border border-gray-600 overflow-hidden mb-1 relative"><div className="h-full bg-green-600 transition-all duration-300" style={{ width: `${(player.hp / player.maxHp) * 100}%` }} /><span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold shadow-black drop-shadow-md">HP {player.hp}/{player.maxHp}</span></div>
              <div className="w-full bg-gray-900 h-2 rounded-full border border-gray-600 overflow-hidden mb-2"><div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${(player.xp / player.maxXp) * 100}%` }} /></div>
              <div className="flex justify-between text-xs text-gray-400 font-mono mb-2"><span title="Total Damage">⚔️ {stats.damage}</span><span title="Total Armor">🛡️ {stats.armor}</span><span className="text-yellow-400">💰 {player.gold || 0}</span></div>
              <button onClick={() => setShowCharacterSheet(true)} className="w-full bg-gray-700 hover:bg-gray-600 text-xs py-1 rounded border border-gray-500">{player.statPoints > 0 ? 'LEVEL UP!' : 'CHARACTER SHEET'}</button>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
              <div className="bg-gray-800 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center"><span>Nearby</span><span className="text-[10px]">{visibleEntities.length}</span></div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {visibleEntities.map(e => (
                      <div key={e.id} className={`bg-gray-800 border border-gray-700 p-2 rounded cursor-pointer hover:border-yellow-500 transition-colors ${target?.id === e.id ? 'border-yellow-500 bg-yellow-900/10' : ''}`} onClick={() => setTarget(e)} onMouseEnter={() => setHighlightedEntityId(e.id)} onMouseLeave={() => setHighlightedEntityId(null)}>
                          <div className="flex justify-between items-start"><span className={`text-sm font-bold ${e.type.startsWith('ENEMY') ? 'text-red-400' : 'text-blue-300'}`}>{e.name}</span><span className="text-[10px] text-gray-500">Lvl {e.level}</span></div>
                          {e.type.startsWith('ENEMY') && (<div className="w-full bg-gray-900 h-1.5 rounded-full mt-1"><div className="h-full bg-red-600" style={{ width: `${(e.hp/e.maxHp)*100}%` }}></div></div>)}
                      </div>
                  ))}
              </div>
              {target && (<div className="p-3 bg-gray-800 border-t border-gray-700"><button onClick={handleSidebarAttack} className={`w-full py-2 rounded font-bold text-sm ${turn - lastActionTurn < config.playerSpeed ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-red-700 hover:bg-red-600 text-white'}`}>ATTACK TARGET</button></div>)}
              <div className="p-2 border-t border-gray-700"><button onClick={() => setAppState('LOBBY')} className="w-full text-xs text-gray-500 hover:text-white uppercase">Return to Lobby</button></div>
          </div>
      </div>
      
      {showCharacterSheet && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-gray-800 border-2 border-gray-600 w-[600px] max-w-full rounded shadow-2xl flex flex-col">
                  <div className="bg-gray-700 p-3 flex justify-between items-center border-b border-gray-600">
                      <div className="flex gap-4"><button onClick={() => setCharSheetTab('stats')} className={`font-bold uppercase ${charSheetTab==='stats' ? 'text-white border-b-2 border-yellow-500' : 'text-gray-400 hover:text-white'}`}>Stats</button><button onClick={() => setCharSheetTab('skills')} className={`font-bold uppercase ${charSheetTab==='skills' ? 'text-white border-b-2 border-yellow-500' : 'text-gray-400 hover:text-white'}`}>Skills</button></div>
                      <button onClick={() => setShowCharacterSheet(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  {charSheetTab === 'stats' && (
                    <div className="p-6 flex gap-6">
                        <div className="w-1/3 border-r border-gray-700 pr-4">
                            <h3 className="text-xs text-gray-500 uppercase font-bold mb-4">Attributes</h3>
                            <div className="space-y-3">{(['str', 'dex', 'int', 'con'] as const).map(stat => (<div key={stat} className="flex justify-between items-center bg-gray-900 p-2 rounded border border-gray-700"><span className="uppercase text-gray-400 font-bold text-sm">{stat}</span><div className="flex items-center gap-2"><span className="text-white font-mono text-lg">{player.stats[stat]}</span>{player.statPoints > 0 && <button onClick={() => handleStatIncrease(stat)} className="w-5 h-5 bg-green-700 hover:bg-green-600 text-white flex items-center justify-center rounded text-xs">+</button>}</div></div>))}</div>
                            <div className="mt-4 space-y-1 text-[10px] text-gray-500">
                                <div><strong className="text-gray-400">STR:</strong> Increases Melee Damage</div>
                                <div><strong className="text-gray-400">DEX:</strong> Increases Armor/Defense</div>
                                <div><strong className="text-gray-400">INT:</strong> Increases Crit Chance</div>
                                <div><strong className="text-gray-400">CON:</strong> Increases Max HP</div>
                            </div>
                            <div className="mt-4 text-center"><div className="text-[10px] text-gray-500 uppercase">Available Points</div><div className={`text-2xl font-bold ${player.statPoints > 0 ? 'text-green-400 animate-pulse' : 'text-gray-600'}`}>{player.statPoints}</div></div>
                        </div>
                        <div className="flex-1 flex flex-col">
                            <h3 className="text-xs text-gray-500 uppercase font-bold mb-2">Equipment</h3>
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {[EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.GLOVES, EquipmentSlot.BOOTS, EquipmentSlot.MAIN_HAND, EquipmentSlot.OFF_HAND].map(slot => (
                                    <div key={slot} className="relative group bg-gray-900 border border-gray-700 h-12 rounded flex flex-col items-center justify-center cursor-pointer hover:border-gray-500" onClick={() => handleUnequip(slot as EquipmentSlot)} onMouseEnter={() => setHoveredItem((player.equipment as any)[slot])} onMouseLeave={() => setHoveredItem(null)}>
                                        {/* @ts-ignore */}
                                        {player.equipment[slot] ? <span className="text-xl">{player.equipment[slot].icon}</span> : <span className="text-[9px] text-gray-600 uppercase">{slot.replace('Hand', '')}</span>}
                                    </div>
                                ))}
                            </div>
                            <h3 className="text-xs text-gray-500 uppercase font-bold mb-2">Rings</h3>
                            <div className="grid grid-cols-5 gap-2 mb-4">
                                {player.equipment?.rings.map((ring, idx) => (
                                    <div key={`ring-${idx}`} className="relative group bg-gray-900 border border-gray-700 h-10 w-10 rounded flex items-center justify-center cursor-pointer hover:border-gray-500" onClick={() => handleUnequip(EquipmentSlot.RING, idx)} onMouseEnter={() => setHoveredItem(ring)} onMouseLeave={() => setHoveredItem(null)}>
                                        {ring ? <span className="text-lg">{ring.icon}</span> : <span className="text-[8px] text-gray-600">RING</span>}
                                    </div>
                                ))}
                            </div>

                            <h3 className="text-xs text-gray-500 uppercase font-bold mb-2">Inventory</h3>
                            <div className="grid grid-cols-5 gap-2 h-40 overflow-y-auto content-start bg-black/20 p-2 rounded border border-gray-700">
                                {player.inventory?.map((item, idx) => (
                                    <div key={idx} className="bg-gray-900 border border-gray-600 h-10 w-10 flex items-center justify-center rounded cursor-pointer hover:bg-gray-700 hover:border-white relative group" onClick={() => handleEquip(item, idx)} onMouseEnter={() => setHoveredItem(item)} onMouseLeave={() => setHoveredItem(null)}><div className="text-lg">{item.icon}</div></div>
                                ))}
                            </div>
                        </div>
                    </div>
                  )}
                  {charSheetTab === 'skills' && (
                      <div className="p-6 overflow-y-auto max-h-[400px]">
                          <div className="space-y-4">{Object.entries(player.skills || {}).map(([skillType, rawData]) => { 
                            const data = rawData as Skill; 
                            const cfg = getSkillConfig(skillType as SkillType, data.level); 
                            return (
                                <div key={skillType} className="bg-gray-900 p-3 rounded border border-gray-700">
                                    <div className="flex justify-between items-center mb-1"><div className="font-bold text-yellow-500">{skillType.replace('_', ' ')}</div><div className="text-xs text-gray-400">Level {data.level}</div></div>
                                    <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden mb-1 border border-gray-600"><div className="h-full bg-blue-600" style={{ width: `${(data.xp / data.nextLevelXp) * 100}%` }}></div></div>
                                    <div className="flex justify-between text-[10px] text-gray-500"><span>{data.xp} / {data.nextLevelXp} XP</span><span>Hit: {Math.floor(cfg.hitChance * 100)}%</span></div>
                                </div>
                            ); 
                           })}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTownService === 'bank' && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
               <div className="bg-emerald-900 border-2 border-emerald-500 w-96 rounded shadow-2xl p-6">
                   <h2 className="text-2xl font-bold text-emerald-200 mb-4 text-center">🏦 Bank</h2>
                   <div className="space-y-2">
                       <button onClick={() => handleBank(player.gold || 0)} className="w-full bg-emerald-700 hover:bg-emerald-600 py-2 rounded font-bold border border-emerald-500">Deposit All</button>
                       <button onClick={() => handleBank(-(player.bankGold || 0))} className="w-full bg-yellow-800 hover:bg-yellow-700 py-2 rounded font-bold border border-yellow-600">Withdraw All</button>
                       <button onClick={() => setActiveTownService(null)} className="w-full mt-4 bg-gray-800 hover:bg-gray-700 py-2 rounded">Leave</button>
                   </div>
               </div>
          </div>
      )}
      {(activeTownService === 'merchant' || activeTownService === 'locker' || showGroundLoot) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
             {activeTownService === 'merchant' && (
               <div className="bg-purple-900 border-2 border-purple-500 w-[500px] rounded shadow-2xl p-6">
                   <h2 className="text-2xl font-bold text-purple-200 mb-2 text-center">Merchant</h2>
                   <div className="flex justify-center gap-4 mb-4"><button onClick={() => setMerchantTab('buy')} className={`px-4 py-1 rounded font-bold ${merchantTab === 'buy' ? 'bg-purple-600' : 'bg-purple-900/50'}`}>Buy</button><button onClick={() => setMerchantTab('sell')} className={`px-4 py-1 rounded font-bold ${merchantTab === 'sell' ? 'bg-purple-600' : 'bg-purple-900/50'}`}>Sell</button></div>
                   <div className="h-64 overflow-y-auto bg-black/20 p-2 rounded mb-4">{merchantTab === 'buy' ? MERCHANT_ITEMS.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-gray-800 p-2 rounded mb-1 border border-gray-700" onMouseEnter={() => setHoveredItem(item)} onMouseLeave={() => setHoveredItem(null)}><span>{item.name} ({item.value}g)</span><button onClick={() => handleBuy(item)} className="bg-green-700 px-2 py-1 rounded text-xs">Buy</button></div>)) : (player.inventory||[]).map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-gray-800 p-2 rounded mb-1 border border-gray-700" onMouseEnter={() => setHoveredItem(item)} onMouseLeave={() => setHoveredItem(null)}><span>{item.name}</span><button onClick={() => handleSell(idx)} className="bg-yellow-700 px-2 py-1 rounded text-xs">Sell {item.value}g</button></div>))}</div>
                   <button onClick={() => setActiveTownService(null)} className="w-full bg-gray-800 py-2 rounded">Leave</button>
               </div>
             )}
             {activeTownService === 'locker' && (
                 <div className="bg-slate-800 border-2 border-slate-500 w-[500px] rounded shadow-2xl p-6">
                     <h2 className="text-2xl font-bold text-white mb-2 text-center">Storage</h2>
                     <div className="flex gap-4 h-64">
                         <div className="flex-1 bg-black/20 p-2 overflow-auto"><h3 className="text-xs text-gray-400">Inventory</h3>{(player.inventory||[]).map((i, idx) => <div key={idx} onClick={() => handleLocker(idx, true)} className="cursor-pointer bg-gray-700 mb-1 p-1 text-xs" onMouseEnter={() => setHoveredItem(i)} onMouseLeave={() => setHoveredItem(null)}>{i.name}</div>)}</div>
                         <div className="flex-1 bg-black/20 p-2 overflow-auto"><h3 className="text-xs text-gray-400">Locker</h3>{(player.locker||[]).map((i, idx) => <div key={idx} onClick={() => handleLocker(idx, false)} className="cursor-pointer bg-gray-700 mb-1 p-1 text-xs" onMouseEnter={() => setHoveredItem(i)} onMouseLeave={() => setHoveredItem(null)}>{i.name}</div>)}</div>
                     </div>
                     <button onClick={() => setActiveTownService(null)} className="w-full mt-4 bg-gray-800 py-2 rounded">Close</button>
                 </div>
             )}
             {showGroundLoot && (
                <div className="bg-gray-800 border-2 border-gray-500 w-80 rounded shadow-xl p-4">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-600 pb-2"><h3 className="font-bold text-lg">Loot</h3><button onClick={() => setShowGroundLoot(false)}>✕</button></div>
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4">{groundItems.map(item => (<div key={item.id} className="flex justify-between items-center bg-gray-700 p-2 rounded cursor-pointer" onClick={() => takeItem(item)}><span>{item.type === EntityType.ITEM_GOLD ? `${item.gold} Gold` : item.lootItem?.name}</span></div>))}</div>
                  <div className="flex gap-2"><button onClick={takeAll} className="flex-1 bg-green-700 py-1 rounded text-sm font-bold">Take All</button><button onClick={takeCoin} className="flex-1 bg-yellow-700 py-1 rounded text-sm font-bold">Coin</button></div>
                </div>
             )}
        </div>
      )}
    </div>
  );
};

export default App;
