export const STAT_KEYS = [
  "INT",
  "REF",
  "TECH",
  "COOL",
  "ATTR",
  "EMP",
  "BODY",
  "RUN",
  "LEAP",
  "LIFT",
] as const;

export const BODY_KEYS = ["Head", "Torso", "R.Arm", "L.Arm", "R.Leg", "L.Leg"] as const;

export const DEFAULT_WEAPON_ROW_COUNT = 6;
export const DEFAULT_ARMOR_ROW_COUNT = 6;
export const DEFAULT_CYBERWARE_TYPE_ROW_COUNT = 8;
export const DEFAULT_CYBERWARE_ROW_COUNT = 14;
export const DEFAULT_CYBERWARE_TYPES = [
  "Fashionware",
  "Neuralware",
  "Cyberoptics",
  "Cyberaudio",
  "Internal Cyberware",
  "External Cyberware",
  "Cyberlimbs",
  "Borgware",
] as const;

export const SKILL_SECTIONS = [
  {
    title: "Awareness",
    items: [
      "Concentration",
      "Conceal/Reveal Object",
      "Lip Reading",
      "Perception",
      "Tracking",
    ],
  },
  {
    title: "Body",
    items: [
      "Athletics",
      "Contortionist",
      "Dance",
      "Endurance",
      "Resist Torture/Drugs",
      "Stealth",
    ],
  },
  {
    title: "Control",
    items: ["Drive Land Vehicle", "Pilot Air Vehicle", "Pilot Sea Vehicle", "Riding"],
  },
  {
    title: "Education",
    items: [
      "Accounting",
      "Anthropology",
      "Animal Handling",
      "Bureaucracy",
      "Business",
      "Composition",
      "Criminology",
      "Cryptography",
      "Deduction",
      "Education",
      "Gamble",
      "Language",
      "Library Search",
      "Local Expert",
      "Science",
      "Tactics",
      "Wilderness Survival",
    ],
  },
  {
    title: "Fighting",
    items: ["Brawling", "Evasion", "Martial Arts", "Melee Weapon"],
  },
  {
    title: "Performance",
    items: ["Acting", "Instrument"],
  },
  {
    title: "Ranged Weapon",
    items: ["Archery", "Autofire", "Handgun", "Heavy Weapons", "Shoulder Arms"],
  },
  {
    title: "Social",
    items: [
      "Bribery",
      "Conversation",
      "Human Perception",
      "Interrogation",
      "Persuasion",
      "Personal Grooming",
      "Streetwise",
      "Trading",
      "Wardrobe & Style",
    ],
  },
  {
    title: "Technique",
    items: [
      "Air Vehicle Tech",
      "Basic Tech",
      "Cybertech",
      "Demolitions",
      "Electronics/Security Tech",
      "First Aid",
      "Forgery",
      "Land Vehicle Tech",
      "Paint/Draw/Sculpt",
      "Paramedic",
      "Photography/Film",
      "Pick Lock",
      "Pick Pocket",
      "Sea Vehicle Tech",
      "Weaponstech",
    ],
  },
] as const;

export const DEFAULT_WEAPONS_ARMOR_ROW_COUNT = 8;
export const DEFAULT_CYBERNETIC_ROW_COUNT = 10;

export type CharacterSheet = {
  handle: string;
  description: string;
  portraitUrl: string;
  stats: Record<(typeof STAT_KEYS)[number], string>;
  combat: {
    location: string;
    armorSp: string;
    save: string;
    btm: string;
    body: Record<(typeof BODY_KEYS)[number], string>;
  };
  weaponRows: Array<{
    name: string;
    dmg: string;
    rof: string;
    hands: string;
    con: string;
    mag: string;
    ammo: string;
    notes: string;
  }>;
  armorRows: Array<{
    name: string;
    sp: string;
    penalty: string;
    notes: string;
  }>;
  cyberwareTypeRows: Array<{
    name: string;
    optionSlots: string;
    foundation: string;
    hl: string;
  }>;
  gear: string;
  cyberwareRows: Array<{
    name: string;
    type: string;
    notes: string;
    hl: string;
  }>;
  humanityTrack: {
    current: string;
    decreased: string;
    max: string;
    totalHl: string;
  };
  economy: {
    cash: string;
    debts: string;
    housing: string;
    rent: string;
    lifestyle: string;
    cost: string;
  };
  weaponsArmorRows: Array<{
    item: string;
    type: string;
    sp: string;
    cost: string;
  }>;
  cybernetics: Array<{
    name: string;
    cost: string;
    hl: string;
  }>;
  skills: Record<string, string>;
  rep: string;
  currentIp: string;
  humanity: string;
};

export function createEmptyCharacterSheet(): CharacterSheet {
  const stats = STAT_KEYS.reduce<Record<string, string>>((accumulator, statKey) => {
    accumulator[statKey] = "";
    return accumulator;
  }, {}) as Record<(typeof STAT_KEYS)[number], string>;

  const body = BODY_KEYS.reduce<Record<string, string>>((accumulator, bodyKey) => {
    accumulator[bodyKey] = "";
    return accumulator;
  }, {}) as Record<(typeof BODY_KEYS)[number], string>;

  const skills = SKILL_SECTIONS.flatMap((section) => section.items).reduce<Record<string, string>>(
    (accumulator, label) => {
      accumulator[label] = "";
      return accumulator;
    },
    {},
  );

  return {
    handle: "",
    description: "",
    portraitUrl: "",
    stats,
    combat: {
      location: "",
      armorSp: "",
      save: "",
      btm: "",
      body,
    },
    weaponRows: Array.from({ length: DEFAULT_WEAPON_ROW_COUNT }, () => ({
      name: "",
      dmg: "",
      rof: "",
      hands: "",
      con: "",
      mag: "",
      ammo: "",
      notes: "",
    })),
    armorRows: Array.from({ length: DEFAULT_ARMOR_ROW_COUNT }, () => ({
      name: "",
      sp: "",
      penalty: "",
      notes: "",
    })),
    cyberwareTypeRows: Array.from({ length: DEFAULT_CYBERWARE_TYPE_ROW_COUNT }, (_, index) => ({
      name: DEFAULT_CYBERWARE_TYPES[index] ?? "",
      optionSlots: "",
      foundation: "",
      hl: "0",
    })),
    gear: "",
    cyberwareRows: Array.from({ length: DEFAULT_CYBERWARE_ROW_COUNT }, () => ({
      name: "",
      type: "",
      notes: "",
      hl: "0",
    })),
    humanityTrack: {
      current: "",
      decreased: "",
      max: "",
      totalHl: "",
    },
    economy: {
      cash: "",
      debts: "",
      housing: "",
      rent: "",
      lifestyle: "",
      cost: "",
    },
    weaponsArmorRows: Array.from({ length: DEFAULT_WEAPONS_ARMOR_ROW_COUNT }, () => ({
      item: "",
      type: "",
      sp: "",
      cost: "",
    })),
    cybernetics: Array.from({ length: DEFAULT_CYBERNETIC_ROW_COUNT }, () => ({
      name: "",
      cost: "",
      hl: "",
    })),
    skills,
    rep: "",
    currentIp: "",
    humanity: "",
  };
}