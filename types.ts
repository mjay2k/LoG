
export enum TileType {
  GRASS = 0,
  DIRT = 1,
  STONE_FLOOR = 2,
  WALL = 3,
  WATER = 4,
  STAIRS_DOWN = 5,
  STAIRS_UP = 6,
  DOOR = 7,
  TREE = 8,
  WOOD_FLOOR = 9,
  VOID = 99
}

export interface CustomTile {
  id: number;
  name: string;
  pixels: string[]; // Array of hex colors for 12x12 grid
}

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY_ORC = 'ENEMY_ORC',
  ENEMY_SKELETON = 'ENEMY_SKELETON',
  NPC = 'NPC',
  FRIENDLY_VILLAGER = 'FRIENDLY_VILLAGER',
  NPC_MERCHANT = 'NPC_MERCHANT',
  NPC_BANKER = 'NPC_BANKER',
  NPC_LOCKER = 'NPC_LOCKER',
  NPC_PRIEST = 'NPC_PRIEST',
  SHERIFF = 'SHERIFF',
  ITEM_GOLD = 'ITEM_GOLD',
  ITEM_LOOT = 'ITEM_LOOT'
}

export enum MapId {
  TOWN = 'TOWN',
  DUNGEON = 'DUNGEON'
}

export enum ClassType {
  WARRIOR = 'WARRIOR',
  ROGUE = 'ROGUE',
  WIZARD = 'WIZARD'
}

export interface Stats {
  str: number; // Damage
  dex: number; // Defense/Armor
  int: number; // Crit Chance
  con: number; // Max HP
}

// --- SKILLS & WEAPONS ---
export enum SkillType {
  MARTIAL_ARTS = 'MARTIAL_ARTS',
  SWORD = 'SWORD',
  BOW = 'BOW',
  MAGIC = 'MAGIC'
}

export enum WeaponType {
  SWORD = 'SWORD',
  BOW = 'BOW',
  STAFF = 'STAFF', 
  DAGGER = 'SWORD', 
  MACE = 'SWORD'   
}

export interface Skill {
  level: number;
  xp: number;
  nextLevelXp: number;
}

export enum EquipmentSlot {
  MAIN_HAND = 'mainHand',
  OFF_HAND = 'offHand',
  HEAD = 'head',
  CHEST = 'chest',
  GLOVES = 'gloves',
  BOOTS = 'boots',
  RING = 'ring' 
}

export enum ItemType {
  EQUIPMENT = 'EQUIPMENT',
  GEM = 'GEM',
  CONSUMABLE = 'CONSUMABLE'
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot?: EquipmentSlot;
  weaponType?: WeaponType; 
  damage?: number;
  armor?: number;
  healAmount?: number;
  value: number;
  icon: string; 
}

export interface Equipment {
  mainHand: Item | null;
  offHand: Item | null;
  head: Item | null;
  chest: Item | null;
  gloves: Item | null;
  boots: Item | null;
  rings: (Item | null)[]; 
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface ActiveEffect {
  id: string;
  type: 'HEAL';
  amountPerTurn: number;
  turnsRemaining: number;
  name: string;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Coordinate;
  hp: number;
  maxHp: number;
  name: string;
  
  // RPG Stats
  level: number;
  class?: ClassType;
  stats: Stats;
  statPoints: number; 
  
  // Skills
  skills?: Record<SkillType, Skill>;

  xp: number;
  maxXp: number;
  
  baseDamage?: number; 
  armor?: number;

  gold?: number;
  bankGold?: number; 
  inventory?: Item[];
  locker?: Item[]; 
  equipment?: Equipment;
  
  lootItem?: Item; 
  activeEffects?: ActiveEffect[];
  
  respawnTurn?: number;
  originalPos?: Coordinate;
  lastSeen?: number; // For Ghost Cleanup
}

export interface Portal {
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
}

export interface GameMap {
  id: string;
  width: number;
  height: number;
  tiles: number[][]; 
  roofs?: number[][]; 
  startPos: Coordinate;
  buildings?: { x: number, y: number, w: number, h: number }[]; 
  initialEntities?: Entity[]; 
  portals?: Portal[];
}

export interface ChatMessage {
  sender: string;
  text: string;
  type: 'system' | 'ai' | 'combat' | 'player' | 'loot' | 'level' | 'danger' | 'global';
}

export interface LobbyMessage {
  id: number;
  sender: string;
  text: string;
  timestamp: number;
}

// --- CONFIGURATION TYPES ---

export interface PlayerLevelData {
  level: number;
  xpRequired: number; 
  statPointsGain: number;
  hpGain: number;
}

export interface SkillLevelData {
  level: number;
  xpRequired: number; 
  damageBonus: number;
  blockChance: number; 
  hitChance: number;   
}

export interface SkillConfig {
  range: number; 
  levels: SkillLevelData[]; 
}

export interface GameConfig {
  turnDuration: number;
  playerSpeed: number; // Cooldown turns
  npcSpeed: number;    // Turns per action
  classStats: Record<ClassType, Stats>;
  playerLevels: PlayerLevelData[];
  skills: Record<SkillType, SkillConfig>;
  customTiles: CustomTile[]; 
}

// --- AUTH & ACCOUNT TYPES ---

export type AppState = 'AUTH' | 'LOBBY' | 'CREATION' | 'GAME';

export interface User {
  username: string;
}

export interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  class: ClassType;
}

export interface Account {
  username: string;
  characters: Entity[]; // Full entity data stored
  lastSeen?: number;
}
