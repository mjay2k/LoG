
import { MapId, TileType, GameMap, Entity, EntityType, Item, EquipmentSlot, ItemType, Stats, ClassType, Portal, SkillType, Skill, WeaponType, GameConfig, SkillConfig, SkillLevelData, PlayerLevelData } from './types';

export const TILE_SIZE = 64;
export const VIEWPORT_WIDTH = 13;
export const VIEWPORT_HEIGHT = 9;

export const COLORS: Record<TileType, string> = {
  [TileType.GRASS]: '#15803d',
  [TileType.DIRT]: '#713f12',
  [TileType.STONE_FLOOR]: '#292524',
  [TileType.WALL]: '#1c1917',
  [TileType.WATER]: '#1e40af',
  [TileType.STAIRS_DOWN]: '#0f172a',
  [TileType.STAIRS_UP]: '#0f172a',
  [TileType.DOOR]: '#451a03',
  [TileType.TREE]: '#14532d',
  [TileType.WOOD_FLOOR]: '#3f200b',
  [TileType.VOID]: '#000000'
};

export const COOLDOWN_TURNS = 5; 
export const ENEMY_TURN_INTERVAL = 4;
export const RESPAWN_TIME_TURNS = 600;

const DEFAULT_CLASS_STATS: Record<ClassType, Stats> = {
  [ClassType.WARRIOR]: { str: 8, dex: 4, int: 2, con: 8 },
  [ClassType.ROGUE]:   { str: 5, dex: 8, int: 5, con: 4 },
  [ClassType.WIZARD]:  { str: 2, dex: 4, int: 10, con: 4 },
};

export const MAX_LEVEL = 25;

const generateDefaultSkillConfig = (type: SkillType): SkillConfig => {
    let range = 1;
    if (type === SkillType.BOW) range = 99; 
    if (type === SkillType.MAGIC) range = 6;
    if (type === SkillType.MARTIAL_ARTS) range = 0;
    
    const levels: SkillLevelData[] = [];
    
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
        const xpRequired = Math.floor(20 * Math.pow(1.8, lvl - 1));
        const damageBonus = lvl * 2;
        let hitChance = 1.0;
        if (type !== SkillType.MAGIC) {
             const miss = 0.40 * Math.pow(0.7, lvl - 1);
             hitChance = Math.max(0, 1 - Math.max(0.01, miss));
        }
        let blockChance = 0;
        if (type === SkillType.SWORD || type === SkillType.MARTIAL_ARTS) {
            const chance = 0.10 * Math.pow(1.12, lvl - 1);
            blockChance = Math.min(0.95, chance);
        }

        levels.push({
            level: lvl,
            xpRequired,
            damageBonus,
            blockChance,
            hitChance
        });
    }

    return { range, levels };
};

const generateDefaultPlayerLevels = (): PlayerLevelData[] => {
    const levels: PlayerLevelData[] = [];
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
        const xpRequired = Math.floor(100 * Math.pow(1.4, lvl - 1));
        levels.push({
            level: lvl,
            xpRequired,
            statPointsGain: 2,
            hpGain: 5
        });
    }
    return levels;
};

export const DEFAULT_CONFIG: GameConfig = {
    turnDuration: 500,
    playerSpeed: 5,
    npcSpeed: 4,
    classStats: DEFAULT_CLASS_STATS,
    playerLevels: generateDefaultPlayerLevels(),
    skills: {
        [SkillType.MARTIAL_ARTS]: generateDefaultSkillConfig(SkillType.MARTIAL_ARTS),
        [SkillType.SWORD]: generateDefaultSkillConfig(SkillType.SWORD),
        [SkillType.BOW]: generateDefaultSkillConfig(SkillType.BOW),
        [SkillType.MAGIC]: generateDefaultSkillConfig(SkillType.MAGIC),
    },
    customTiles: []
};

export const INITIAL_SKILLS: Record<SkillType, Skill> = {
  [SkillType.MARTIAL_ARTS]: { level: 1, xp: 0, nextLevelXp: 20 },
  [SkillType.SWORD]:    { level: 1, xp: 0, nextLevelXp: 20 },
  [SkillType.BOW]:      { level: 1, xp: 0, nextLevelXp: 20 },
  [SkillType.MAGIC]:    { level: 1, xp: 0, nextLevelXp: 20 },
};

export const generateNPCStats = (type: EntityType, level: number): Stats => {
  const base = { str: 5, dex: 5, int: 5, con: 5 };
  const points = level * 3; 

  if (type === EntityType.ENEMY_ORC) {
    base.str += Math.floor(points * 0.6);
    base.con += Math.floor(points * 0.4);
  } else if (type === EntityType.ENEMY_SKELETON) {
    base.dex += Math.floor(points * 0.5);
    base.str += Math.floor(points * 0.5);
  } else if (type === EntityType.SHERIFF) {
    base.str += Math.floor(points * 0.5); 
    base.dex += Math.floor(points * 0.3);
    base.con += Math.floor(points * 0.4);
  } else {
    base.str += Math.floor(points * 0.25);
    base.dex += Math.floor(points * 0.25);
    base.int += Math.floor(points * 0.25);
    base.con += Math.floor(points * 0.25);
  }
  return base;
};

const PREFIXES = ['Rusty', 'Old', 'Iron', 'Steel', 'Shiny', 'Magic', 'Ancient'];
const SUFFIXES = ['of Power', 'of Swiftness', 'of the Bear', 'of the Wolf', ''];

const GEMS = [
  { name: 'Cracked Quartz', value: 5, icon: '💎' },
  { name: 'Agate', value: 15, icon: '🪨' },
  { name: 'Jade', value: 40, icon: '❇️' },
  { name: 'Topaz', value: 80, icon: '🔶' },
  { name: 'Sapphire', value: 150, icon: '🔹' },
  { name: 'Ruby', value: 300, icon: '🔻' },
  { name: 'Diamond', value: 800, icon: '💠' },
  { name: 'Star Fragment', value: 2000, icon: '✨' }
];

export const HEALING_TONIC: Item = {
  id: 'tonic_base',
  name: 'Healing Tonic (HoT)',
  type: ItemType.CONSUMABLE,
  value: 10,
  healAmount: 50, // Total heal over time
  icon: '🧪'
};

export const MERCHANT_ITEMS: Item[] = [
  { ...HEALING_TONIC, id: 'shop_tonic', value: 25 },
  { id: 'shop_sword', name: 'Iron Broadsword', type: ItemType.EQUIPMENT, slot: EquipmentSlot.MAIN_HAND, weaponType: WeaponType.SWORD, damage: 5, value: 100, icon: '⚔️' },
  { id: 'shop_bow', name: 'Hunting Bow', type: ItemType.EQUIPMENT, slot: EquipmentSlot.MAIN_HAND, weaponType: WeaponType.BOW, damage: 4, value: 120, icon: '🏹' },
  { id: 'shop_staff', name: 'Acolyte Staff', type: ItemType.EQUIPMENT, slot: EquipmentSlot.MAIN_HAND, weaponType: WeaponType.STAFF, damage: 3, value: 150, icon: '🦯' },
  { id: 'shop_shield', name: 'Wooden Shield', type: ItemType.EQUIPMENT, slot: EquipmentSlot.OFF_HAND, armor: 3, value: 80, icon: '🛡️' },
  { id: 'shop_helm', name: 'Steel Helm', type: ItemType.EQUIPMENT, slot: EquipmentSlot.HEAD, armor: 4, value: 120, icon: '🪖' },
  { id: 'shop_chest', name: 'Leather Cuirass', type: ItemType.EQUIPMENT, slot: EquipmentSlot.CHEST, armor: 5, value: 150, icon: '🧥' },
  { id: 'shop_ring_str', name: 'Ring of Might', type: ItemType.EQUIPMENT, slot: EquipmentSlot.RING, damage: 2, value: 300, icon: '💍' },
  { id: 'shop_ring_def', name: 'Ring of Protection', type: ItemType.EQUIPMENT, slot: EquipmentSlot.RING, armor: 2, value: 300, icon: '💍' },
];

export const generateLoot = (): Item => {
  const roll = Math.random();
  const id = `item_${Date.now()}_${Math.random()}`;

  if (roll < 0.1) {
    return { ...HEALING_TONIC, id };
  }
  else if (roll < 0.8) {
     const gemRoll = Math.pow(Math.random(), 2); 
     let selectedGem = GEMS[0];
     const r = Math.random();
     if (r > 0.98) selectedGem = GEMS[7];
     else if (r > 0.95) selectedGem = GEMS[6];
     else if (r > 0.90) selectedGem = GEMS[5];
     else if (r > 0.80) selectedGem = GEMS[4];
     else if (r > 0.60) selectedGem = GEMS[3];
     else if (r > 0.40) selectedGem = GEMS[2];
     else if (r > 0.20) selectedGem = GEMS[1];
     else selectedGem = GEMS[0];

     return {
         id,
         name: selectedGem.name,
         type: ItemType.GEM,
         value: selectedGem.value,
         icon: selectedGem.icon
     };
  } else {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const equipRoll = Math.random();
    
    if (equipRoll < 0.2) {
      return {
        id,
        name: `${prefix} Sword ${suffix}`,
        type: ItemType.EQUIPMENT,
        slot: EquipmentSlot.MAIN_HAND,
        weaponType: WeaponType.SWORD,
        damage: Math.floor(Math.random() * 5) + 2,
        value: 50,
        icon: '⚔️'
      };
    } else if (equipRoll < 0.3) {
      return {
        id,
        name: `${prefix} Bow ${suffix}`,
        type: ItemType.EQUIPMENT,
        slot: EquipmentSlot.MAIN_HAND,
        weaponType: WeaponType.BOW,
        damage: Math.floor(Math.random() * 4) + 2,
        value: 50,
        icon: '🏹'
      };
    } else if (equipRoll < 0.6) {
      return {
        id,
        name: `${prefix} Plate ${suffix}`,
        type: ItemType.EQUIPMENT,
        slot: EquipmentSlot.CHEST,
        armor: Math.floor(Math.random() * 5) + 2,
        value: 60,
        icon: '🛡️'
      };
    } else if (equipRoll < 0.9) {
      return {
        id,
        name: `${prefix} Ring ${suffix}`,
        type: ItemType.EQUIPMENT,
        slot: EquipmentSlot.RING,
        damage: Math.random() > 0.5 ? 1 : 0,
        armor: Math.random() > 0.5 ? 1 : 0,
        value: 100,
        icon: '💍'
      };
    } else {
      return {
        id,
        name: `${prefix} Helm`,
        type: ItemType.EQUIPMENT,
        slot: EquipmentSlot.HEAD,
        armor: Math.floor(Math.random() * 3) + 1,
        value: 40,
        icon: '🪖'
      };
    }
  }
};

const MAP_SIZE = 150;

const generateInteriorMap = (id: string, width: number, height: number, floorType: TileType, entities: Entity[]): GameMap => {
    const tiles = Array(width).fill(0).map(() => Array(height).fill(floorType));
    for (let x = 0; x < width; x++) {
        tiles[x][0] = TileType.WALL;
        tiles[x][height - 1] = TileType.WALL;
    }
    for (let y = 0; y < height; y++) {
        tiles[0][y] = TileType.WALL;
        tiles[width - 1][y] = TileType.WALL;
    }
    const exitX = Math.floor(width / 2);
    const exitY = height - 1;
    tiles[exitX][exitY] = TileType.DOOR;

    return {
        id,
        width,
        height,
        tiles,
        startPos: { x: exitX, y: exitY - 1 },
        initialEntities: entities,
        portals: []
    };
};

const generateOverworld = (): { 
  townMap: GameMap, 
  interiors: Record<string, GameMap> 
} => {
  const tiles = Array(MAP_SIZE).fill(0).map(() => Array(MAP_SIZE).fill(TileType.GRASS));
  const roofs = Array(MAP_SIZE).fill(0).map(() => Array(MAP_SIZE).fill(0));
  const entities: Entity[] = [];
  const buildings: { x: number, y: number, w: number, h: number }[] = [];
  const portals: Portal[] = [];
  const interiors: Record<string, GameMap> = {};
  let entityCount = 0;

  const centerX = Math.floor(MAP_SIZE / 2);
  const centerY = Math.floor(MAP_SIZE / 2);

  for (let i = 0; i < 150; i++) {
    const cx = Math.floor(Math.random() * (MAP_SIZE - 10)) + 5;
    const cy = Math.floor(Math.random() * (MAP_SIZE - 10)) + 5;
    const distFromCenter = Math.sqrt(Math.pow(cx - centerX, 2) + Math.pow(cy - centerY, 2));
    if (distFromCenter < 25) continue;
    const radius = Math.floor(Math.random() * 5) + 2;
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x > 0 && x < MAP_SIZE && y > 0 && y < MAP_SIZE) {
          if (Math.random() > 0.4 && tiles[x][y] === TileType.GRASS) { 
            tiles[x][y] = TileType.TREE;
          }
        }
      }
    }
  }

  for (let i = 0; i < 100; i++) {
    let cx = Math.floor(Math.random() * MAP_SIZE);
    let cy = Math.floor(Math.random() * MAP_SIZE);
    for (let steps = 0; steps < 50; steps++) {
        if (cx >= 0 && cx < MAP_SIZE && cy >= 0 && cy < MAP_SIZE) {
            if (tiles[cx][cy] === TileType.GRASS) tiles[cx][cy] = TileType.DIRT;
        }
        cx += Math.floor(Math.random() * 3) - 1;
        cy += Math.floor(Math.random() * 3) - 1;
    }
  }

  const numHouses = 60;
  for (let i = 0; i < numHouses; i++) {
    const w = Math.floor(Math.random() * 6) + 6;
    const h = Math.floor(Math.random() * 6) + 5;
    const x = Math.floor(Math.random() * (MAP_SIZE - w - 2)) + 1;
    const y = Math.floor(Math.random() * (MAP_SIZE - h - 2)) + 1;
    const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    if (distFromCenter < 20) continue;

    let clear = true;
    for(let checkX = x-1; checkX < x+w+1; checkX++) {
        for(let checkY = y-1; checkY < y+h+1; checkY++) {
            if(tiles[checkX][checkY] !== TileType.GRASS && tiles[checkX][checkY] !== TileType.DIRT) {
                clear = false;
            }
        }
    }

    if (clear) {
      buildings.push({ x, y, w, h });
      for (let bx = x; bx < x + w; bx++) {
        for (let by = y; by < y + h; by++) {
          tiles[bx][by] = TileType.STONE_FLOOR;
          roofs[bx][by] = 1;
          if (bx === x || bx === x + w - 1 || by === y || by === y + h - 1) {
            tiles[bx][by] = TileType.WALL;
          }
        }
      }
      const doorX = x + Math.floor(w / 2);
      const doorY = y + h - 1; 
      tiles[doorX][doorY] = TileType.DOOR;
      roofs[doorX][doorY] = 0; 
      
      const interiorId = `house_${x}_${y}`;
      const interiorEnts: Entity[] = [];
      if (Math.random() > 0.3) {
          const stats = generateNPCStats(EntityType.FRIENDLY_VILLAGER, 1);
          interiorEnts.push({
              id: `villager_${entityCount++}`,
              type: EntityType.FRIENDLY_VILLAGER,
              pos: { x: Math.floor(w/2), y: Math.floor(h/2) },
              hp: 20, maxHp: 20, name: 'Villager',
              level: 1, xp: 0, maxXp: 0, stats, statPoints: 0
          });
      }
      interiors[interiorId] = generateInteriorMap(interiorId, w, h, TileType.WOOD_FLOOR, interiorEnts);
      
      portals.push({
          x: doorX, y: doorY,
          targetMapId: interiorId,
          targetX: Math.floor(w/2), targetY: h - 2
      });
      interiors[interiorId].portals?.push({
          x: Math.floor(w/2), y: h - 1,
          targetMapId: MapId.TOWN,
          targetX: doorX, targetY: doorY + 1
      });
    }
  }

  const churchX = centerX;
  const churchY = centerY - 10;
  const churchW = 10;
  const churchH = 14;
  
  for(let bx=churchX; bx<churchX+churchW; bx++) {
      for(let by=churchY; by<churchY+churchH; by++) {
          tiles[bx][by] = TileType.STONE_FLOOR;
          roofs[bx][by] = 1;
          if(bx===churchX || bx===churchX+churchW-1 || by===churchY || by===churchY+churchH-1) tiles[bx][by] = TileType.WALL;
      }
  }
  const churchDoorX = churchX + 5;
  const churchDoorY = churchY + churchH - 1;
  tiles[churchDoorX][churchDoorY] = TileType.DOOR;
  roofs[churchDoorX][churchDoorY] = 0;
  
  const churchIntId = 'interior_church';
  const priestStats = generateNPCStats(EntityType.NPC_PRIEST, 20);
  const churchEnts: Entity[] = [
      { id: 'priest', type: EntityType.NPC_PRIEST, pos: {x: 5, y: 5}, hp: 100, maxHp: 100, name: 'High Priest', level: 20, xp:0, maxXp:0, stats: priestStats, statPoints: 0 }
  ];
  interiors[churchIntId] = generateInteriorMap(churchIntId, churchW, churchH, TileType.STONE_FLOOR, churchEnts);
  interiors[churchIntId].tiles[2][2] = TileType.STAIRS_DOWN;
  interiors[churchIntId].portals?.push({
      x: 2, y: 2,
      targetMapId: MapId.DUNGEON,
      targetX: 2, targetY: 2 
  });

  portals.push({ x: churchDoorX, y: churchDoorY, targetMapId: churchIntId, targetX: 5, targetY: churchH - 2 });
  interiors[churchIntId].portals?.push({ x: 5, y: churchH - 1, targetMapId: MapId.TOWN, targetX: churchDoorX, targetY: churchDoorY + 1 });

  const merchX = centerX + 12;
  const merchY = centerY;
  const merchW = 8;
  const merchH = 8;
  for(let bx=merchX; bx<merchX+merchW; bx++) {
      for(let by=merchY; by<merchY+merchH; by++) {
          tiles[bx][by] = TileType.STONE_FLOOR;
          roofs[bx][by] = 1;
          if(bx===merchX || bx===merchX+merchW-1 || by===merchY || by===merchY+merchH-1) tiles[bx][by] = TileType.WALL;
      }
  }
  const merchDoorX = merchX + 4;
  const merchDoorY = merchY + merchH - 1;
  tiles[merchDoorX][merchDoorY] = TileType.DOOR;
  tiles[merchDoorX][merchDoorY+1] = TileType.DIRT; 
  roofs[merchDoorX][merchDoorY] = 0;

  const merchIntId = 'interior_merchant';
  const merchEnts: Entity[] = [{ id: 'merchant', type: EntityType.NPC_MERCHANT, pos: {x: 4, y: 4}, hp: 50, maxHp: 50, name: 'Merchant', level: 10, xp:0, maxXp:0, stats: generateNPCStats(EntityType.NPC_MERCHANT, 10), statPoints: 0 }];
  interiors[merchIntId] = generateInteriorMap(merchIntId, merchW, merchH, TileType.WOOD_FLOOR, merchEnts);
  
  portals.push({ x: merchDoorX, y: merchDoorY, targetMapId: merchIntId, targetX: 4, targetY: merchH - 2 });
  interiors[merchIntId].portals?.push({ x: 4, y: merchH - 1, targetMapId: MapId.TOWN, targetX: merchDoorX, targetY: merchDoorY + 1 });

  const bankX = centerX - 12;
  const bankY = centerY;
  const bankW = 8;
  const bankH = 8;
  for(let bx=bankX; bx<bankX+bankW; bx++) {
      for(let by=bankY; by<bankY+bankH; by++) {
          tiles[bx][by] = TileType.STONE_FLOOR;
          roofs[bx][by] = 1;
          if(bx===bankX || bx===bankX+bankW-1 || by===bankY || by===bankY+bankH-1) tiles[bx][by] = TileType.WALL;
      }
  }
  const bankDoorX = bankX + 4;
  const bankDoorY = bankY + bankH - 1;
  tiles[bankDoorX][bankDoorY] = TileType.DOOR;
  tiles[bankDoorX][bankDoorY+1] = TileType.DIRT;
  roofs[bankDoorX][bankDoorY] = 0;

  const bankIntId = 'interior_bank';
  const bankEnts: Entity[] = [{ id: 'banker', type: EntityType.NPC_BANKER, pos: {x: 4, y: 4}, hp: 50, maxHp: 50, name: 'Banker', level: 10, xp:0, maxXp:0, stats: generateNPCStats(EntityType.NPC_BANKER, 10), statPoints: 0 }];
  interiors[bankIntId] = generateInteriorMap(bankIntId, bankW, bankH, TileType.WOOD_FLOOR, bankEnts);
  
  portals.push({ x: bankDoorX, y: bankDoorY, targetMapId: bankIntId, targetX: 4, targetY: bankH - 2 });
  interiors[bankIntId].portals?.push({ x: 4, y: bankH - 1, targetMapId: MapId.TOWN, targetX: bankDoorX, targetY: bankDoorY + 1 });

  const lockX = centerX - 6;
  const lockY = centerY + 8;
  const lockW = 6;
  const lockH = 6;
    for(let bx=lockX; bx<lockX+lockW; bx++) {
      for(let by=lockY; by<lockY+lockH; by++) {
          tiles[bx][by] = TileType.STONE_FLOOR;
          roofs[bx][by] = 1;
          if(bx===lockX || bx===lockX+lockW-1 || by===lockY || by===lockY+lockH-1) tiles[bx][by] = TileType.WALL;
      }
  }
  const lockDoorX = lockX + 2;
  const lockDoorY = lockY + lockH - 1;
  tiles[lockDoorX][lockDoorY] = TileType.DOOR;
  roofs[lockDoorX][lockDoorY] = 0;
  
  const lockIntId = 'interior_locker';
  const lockEnts: Entity[] = [{ id: 'locker_master', type: EntityType.NPC_LOCKER, pos: {x: 2, y: 2}, hp: 50, maxHp: 50, name: 'Vault Master', level: 10, xp:0, maxXp:0, stats: generateNPCStats(EntityType.NPC_LOCKER, 10), statPoints: 0 }];
  interiors[lockIntId] = generateInteriorMap(lockIntId, lockW, lockH, TileType.STONE_FLOOR, lockEnts);

  // Correct portal alignment for Locker: Width is 6, so center is 3.
  portals.push({ x: lockDoorX, y: lockDoorY, targetMapId: lockIntId, targetX: 3, targetY: lockH - 2 });
  interiors[lockIntId].portals?.push({ x: 3, y: lockH - 1, targetMapId: MapId.TOWN, targetX: lockDoorX, targetY: lockDoorY + 1 });

  const sheriffStats = generateNPCStats(EntityType.SHERIFF, 15);
  sheriffStats.dex = 15; 
  entities.push({
      id: 'sheriff', type: EntityType.SHERIFF, pos: {x: centerX+2, y: centerY+8}, hp: 300, maxHp: 300, name: 'Sheriff Lawman', level: 15, xp: 0, maxXp: 0, stats: sheriffStats, statPoints: 0
  });

  for (let i = 0; i < 40; i++) {
    const ex = Math.floor(Math.random() * MAP_SIZE);
    const ey = Math.floor(Math.random() * MAP_SIZE);
    const dist = Math.sqrt(Math.pow(ex - centerX, 2) + Math.pow(ey - centerY, 2));
    
    if (dist > 30 && tiles[ex][ey] === TileType.GRASS) {
       const isOrc = Math.random() > 0.5;
       const lvl = Math.floor(Math.random() * 5) + 1;
       const stats = generateNPCStats(isOrc ? EntityType.ENEMY_ORC : EntityType.ENEMY_SKELETON, lvl);
       entities.push({
           id: `enemy_${i}`,
           type: isOrc ? EntityType.ENEMY_ORC : EntityType.ENEMY_SKELETON,
           pos: { x: ex, y: ey },
           hp: 20 + (lvl * 5), maxHp: 20 + (lvl * 5),
           name: isOrc ? 'Orc' : 'Skeleton',
           level: lvl, xp: 0, maxXp: 0,
           stats, statPoints: 0,
           respawnTurn: 0,
           originalPos: { x: ex, y: ey }
       });
    }
  }

  const townMap: GameMap = {
    id: MapId.TOWN,
    width: MAP_SIZE,
    height: MAP_SIZE,
    tiles,
    roofs,
    startPos: { x: centerX, y: centerY + 5 },
    buildings,
    initialEntities: entities,
    portals
  };

  return { townMap, interiors };
};

const generateDungeon = (): GameMap => {
    const w = 40;
    const h = 40;
    const tiles = Array(w).fill(0).map(() => Array(h).fill(TileType.WALL));
    const entities: Entity[] = [];

    for(let x=1; x<=3; x++) {
        for(let y=1; y<=3; y++) {
            tiles[x][y] = TileType.STONE_FLOOR;
        }
    }

    const rooms = [];
    rooms.push({x:1, y:1, w:3, h:3}); 

    for(let i=0; i<15; i++) {
        const rw = Math.floor(Math.random() * 6) + 4;
        const rh = Math.floor(Math.random() * 6) + 4;
        const rx = Math.floor(Math.random() * (w - rw - 2)) + 1;
        const ry = Math.floor(Math.random() * (h - rh - 2)) + 1;
        
        if (rx < 5 && ry < 5) continue;

        let overlap = false;
        for(let x=rx; x<rx+rw; x++) {
            for(let y=ry; y<ry+rh; y++) {
                tiles[x][y] = TileType.STONE_FLOOR;
            }
        }
        rooms.push({x:rx, y:ry, w:rw, h:rh});

        if (Math.random() > 0.3) {
            const isOrc = Math.random() > 0.5;
            const lvl = Math.floor(Math.random() * 5) + 5; 
            entities.push({
                id: `dungeon_mob_${i}`,
                type: isOrc ? EntityType.ENEMY_ORC : EntityType.ENEMY_SKELETON,
                pos: { x: rx + 2, y: ry + 2 },
                hp: 40 + (lvl * 5), maxHp: 40 + (lvl * 5),
                name: isOrc ? 'Dungeon Orc' : 'Dungeon Skeleton',
                level: lvl, xp: 0, maxXp: 0,
                stats: generateNPCStats(isOrc ? EntityType.ENEMY_ORC : EntityType.ENEMY_SKELETON, lvl),
                statPoints: 0,
                respawnTurn: 0,
                originalPos: { x: rx + 2, y: ry + 2 }
            });
        }
    }

    for(let i=0; i<rooms.length-1; i++) {
        const r1 = rooms[i];
        const r2 = rooms[i+1];
        const c1 = { x: Math.floor(r1.x + r1.w/2), y: Math.floor(r1.y + r1.h/2) };
        const c2 = { x: Math.floor(r2.x + r2.w/2), y: Math.floor(r2.y + r2.h/2) };

        const xStart = Math.min(c1.x, c2.x);
        const xEnd = Math.max(c1.x, c2.x);
        for(let x=xStart; x<=xEnd; x++) tiles[x][c1.y] = TileType.STONE_FLOOR;

        const yStart = Math.min(c1.y, c2.y);
        const yEnd = Math.max(c1.y, c2.y);
        for(let y=yStart; y<=yEnd; y++) tiles[c2.x][y] = TileType.STONE_FLOOR;
    }

    tiles[2][2] = TileType.STAIRS_UP;

    return {
        id: MapId.DUNGEON,
        width: w,
        height: h,
        tiles,
        startPos: { x: 2, y: 2 },
        initialEntities: entities,
        portals: [{ x: 2, y: 2, targetMapId: 'interior_church', targetX: 2, targetY: 2 }]
    };
};

// EXPORT FUNCTION INSTEAD OF CONSTANT TO PREVENT RE-GEN
export const generateDefaultWorld = (): Record<string, GameMap> => {
    const generated = generateOverworld();
    const dungeon = generateDungeon();
    return {
        [MapId.TOWN]: generated.townMap,
        [MapId.DUNGEON]: dungeon,
        ...generated.interiors
    };
};
