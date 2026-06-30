"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BODY_KEYS,
  CharacterSheet,
  SKILL_SECTIONS,
  STAT_KEYS,
  createEmptyCharacterSheet,
} from "@/lib/character-sheet";
import {
  CYBERWARE_CATALOG,
  getAvailableOptionSlotsForType,
  findCyberwareCatalogEntry,
  getCyberwarePrerequisiteWarnings,
} from "@/lib/cyberware-data";
import skillDescriptionsData from "@/lib/skill-descriptions.json";
import weaponsCatalogData from "@/lib/weapons.json";

const OPEN_DICE_ROLLER_EVENT = "needleweb:open-dice-roller";

type MemberProfile = {
  id: number;
  username: string;
  email: string;
  role: "Admin" | "Member" | "Guest";
  status: "Online" | "Active" | "Inactive" | "Invited";
  joinedDate: string;
  lastActive: string | null;
  sheet: CharacterSheet;
};

type Props = {
  initialUser: MemberProfile;
  saveEndpoint?: string;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  canEdit?: boolean;
  canEditReadOnlyFields?: boolean;
};

type UpdateResponse = {
  user?: MemberProfile;
  error?: string;
};

type ParsedHlRule = {
  defaultValue: number;
  defaultValueLabel: string;
  rollLabel: string | null;
  roll: (() => number) | null;
};

const SKILL_DESCRIPTIONS =
  (skillDescriptionsData as { descriptions: Record<string, string> }).descriptions;

const WEAPONS_CATALOG = weaponsCatalogData as {
  melee: Array<{
    weaponType: string;
    examples: string[];
    handsRequired: string;
    damage: string;
    rof: number;
    canBeConcealed: boolean;
    cost: string;
    priceCategory: string;
  }>;
  ranged: Array<{
    weaponType: string;
    weaponSkill: string;
    singleShotDamage: string;
    standardMagazine: string;
    rof: number;
    handsRequired: number;
    canBeConcealed: boolean;
    cost: string;
    priceCategory: string;
    specialFeatures: string[];
  }>;
};

type InventoryCatalogOption = {
  name: string;
  source: "Cyberware" | "Weapons";
  description: string;
};

type WeaponEquipPreset = {
  name: string;
  dmg: string;
  rof: string;
  hands: string;
  con: string;
  mag: string;
  ammo: string;
  notes: string;
};

const WEAPON_EQUIP_PRESETS = new Map<string, WeaponEquipPreset>();
const CYBERWARE_EQUIP_NAMES = new Set<string>();

const CYBERWARE_INVENTORY_OPTIONS: InventoryCatalogOption[] = CYBERWARE_CATALOG.map((entry) => ({
  name: entry.name.trim(),
  source: "Cyberware",
  description: `${entry.type} | ${entry.cost} | HL ${entry.hl}. ${entry.descriptionData}`,
}))
  .filter((option) => option.name.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

const WEAPON_INVENTORY_OPTIONS: InventoryCatalogOption[] = [
  ...WEAPONS_CATALOG.melee.flatMap((weapon) => {
    const baseDescription = `${weapon.weaponType} | DMG ${weapon.damage} | ROF ${weapon.rof} | Hands ${weapon.handsRequired} | Concealed ${weapon.canBeConcealed ? "Yes" : "No"} | ${weapon.cost} (${weapon.priceCategory})`;
    WEAPON_EQUIP_PRESETS.set(weapon.weaponType.trim().toLowerCase(), {
      name: weapon.weaponType.trim(),
      dmg: weapon.damage,
      rof: String(weapon.rof),
      hands: weapon.handsRequired,
      con: weapon.canBeConcealed ? "Yes" : "No",
      mag: "N/A",
      ammo: "N/A",
      notes: `Cost ${weapon.cost} (${weapon.priceCategory})`,
    });
    const baseEntry: InventoryCatalogOption = {
      name: weapon.weaponType.trim(),
      source: "Weapons",
      description: baseDescription,
    };

    const exampleEntries = weapon.examples.map<InventoryCatalogOption>((example) => {
      const trimmedExample = example.trim();
      WEAPON_EQUIP_PRESETS.set(trimmedExample.toLowerCase(), {
        name: trimmedExample,
        dmg: weapon.damage,
        rof: String(weapon.rof),
        hands: weapon.handsRequired,
        con: weapon.canBeConcealed ? "Yes" : "No",
        mag: "N/A",
        ammo: "N/A",
        notes: `${weapon.weaponType} | Cost ${weapon.cost} (${weapon.priceCategory})`,
      });

      return {
        name: trimmedExample,
        source: "Weapons",
        description: `${trimmedExample} (${weapon.weaponType}) | DMG ${weapon.damage} | ROF ${weapon.rof} | Hands ${weapon.handsRequired} | Concealed ${weapon.canBeConcealed ? "Yes" : "No"} | ${weapon.cost} (${weapon.priceCategory})`,
      };
    });

    return [baseEntry, ...exampleEntries];
  }),
  ...WEAPONS_CATALOG.ranged.map<InventoryCatalogOption>((weapon) => {
    const trimmedType = weapon.weaponType.trim();
    WEAPON_EQUIP_PRESETS.set(trimmedType.toLowerCase(), {
      name: trimmedType,
      dmg: weapon.singleShotDamage,
      rof: String(weapon.rof),
      hands: String(weapon.handsRequired),
      con: weapon.canBeConcealed ? "Yes" : "No",
      mag: weapon.standardMagazine,
      ammo: weapon.standardMagazine,
      notes: `${weapon.weaponSkill}${weapon.specialFeatures.length > 0 ? ` | ${weapon.specialFeatures.join(", ")}` : ""} | Cost ${weapon.cost} (${weapon.priceCategory})`,
    });

    return {
      name: trimmedType,
      source: "Weapons",
      description: `${weapon.weaponSkill} | DMG ${weapon.singleShotDamage} | Mag ${weapon.standardMagazine} | ROF ${weapon.rof} | Hands ${weapon.handsRequired} | Concealed ${weapon.canBeConcealed ? "Yes" : "No"} | ${weapon.cost} (${weapon.priceCategory}) | ${weapon.specialFeatures.join(" | ")}`,
    };
  }),
]
  .filter((option) => option.name.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

for (const entry of CYBERWARE_CATALOG) {
  const trimmedName = entry.name.trim();
  if (trimmedName.length > 0) {
    CYBERWARE_EQUIP_NAMES.add(trimmedName.toLowerCase());
  }
}

function sumDice(diceCount: number, sides: number) {
  return Array.from({ length: diceCount }).reduce<number>(
    (total) => total + Math.floor(Math.random() * sides) + 1,
    0,
  );
}

function parseHlRule(rawHl: string): ParsedHlRule {
  const defaultMatch = rawHl.match(/^(\d+)/);
  const defaultValue = defaultMatch ? Number.parseInt(defaultMatch[1], 10) : 0;
  const instructionMatch = rawHl.match(/\(([^)]+)\)/);

  if (!instructionMatch) {
    return {
      defaultValue,
      defaultValueLabel: String(defaultValue),
      rollLabel: null,
      roll: null,
    };
  }

  const instruction = instructionMatch[1].trim();
  if (/^N\/A$/i.test(instruction)) {
    return {
      defaultValue,
      defaultValueLabel: String(defaultValue),
      rollLabel: null,
      roll: null,
    };
  }

  const rollUpMatch = instruction.match(/^(\d+)d(\d+)\s*\/\s*2\s*Round\s*up$/i);
  if (rollUpMatch) {
    const diceCount = Number.parseInt(rollUpMatch[1], 10);
    const sides = Number.parseInt(rollUpMatch[2], 10);
    return {
      defaultValue,
      defaultValueLabel: String(defaultValue),
      rollLabel: instruction,
      roll: () => Math.ceil(sumDice(diceCount, sides) / 2),
    };
  }

  const basicRollMatch = instruction.match(/^(\d+)d(\d+)$/i);
  if (basicRollMatch) {
    const diceCount = Number.parseInt(basicRollMatch[1], 10);
    const sides = Number.parseInt(basicRollMatch[2], 10);
    return {
      defaultValue,
      defaultValueLabel: String(defaultValue),
      rollLabel: instruction,
      roll: () => sumDice(diceCount, sides),
    };
  }

  return {
    defaultValue,
    defaultValueLabel: String(defaultValue),
    rollLabel: null,
    roll: null,
  };
}

function normalizeHlToNumberString(value: string, fallbackValue: number) {
  if (value.trim().length === 0) {
    return "";
  }

  const numericMatch = value.match(/-?\d+/);
  if (!numericMatch) {
    return String(fallbackValue);
  }

  const parsed = Number.parseInt(numericMatch[0], 10);
  return Number.isFinite(parsed) ? String(parsed) : String(fallbackValue);
}

function createEmptyWeaponRow(): CharacterSheet["weaponRows"][number] {
  return {
    name: "",
    dmg: "",
    rof: "",
    hands: "",
    con: "",
    mag: "",
    ammo: "",
    notes: "",
  };
}

function createEmptyArmorRow(): CharacterSheet["armorRows"][number] {
  return {
    name: "",
    sp: "",
    penalty: "",
    notes: "",
  };
}

function createEmptyCyberwareRow(): CharacterSheet["cyberwareRows"][number] {
  return {
    name: "",
    type: "",
    notes: "",
    hl: "",
  };
}

function buildGearTextFromInventoryItems(items: CharacterSheet["inventoryItems"]) {
  return items.map((item) => `- ${item.name}`).join("\n");
}

function isWeaponRowEmpty(row: CharacterSheet["weaponRows"][number]) {
  return (
    row.name.trim().length === 0 &&
    row.dmg.trim().length === 0 &&
    row.rof.trim().length === 0 &&
    row.hands.trim().length === 0 &&
    row.con.trim().length === 0 &&
    row.mag.trim().length === 0 &&
    row.ammo.trim().length === 0 &&
    row.notes.trim().length === 0
  );
}

function isCyberwareRowEmpty(row: CharacterSheet["cyberwareRows"][number]) {
  return (
    row.name.trim().length === 0 &&
    row.type.trim().length === 0 &&
    row.notes.trim().length === 0 &&
    row.hl.trim().length === 0
  );
}

function isFoundationCyberwareDescription(description: string) {
  return /Has\s+\d+\s+Option\s+Slots?/i.test(description);
}

function hasInstalledFoundationCyberwareForType(
  typeName: string,
  installedCyberware: Array<{ name: string; type: string }>,
) {
  const normalizedType = typeName.trim().toLowerCase();
  if (!normalizedType) {
    return false;
  }

  return installedCyberware.some((item) => {
    const entry = findCyberwareCatalogEntry(item.name);
    if (!entry) {
      return false;
    }

    return (
      entry.type.trim().toLowerCase() === normalizedType &&
      isFoundationCyberwareDescription(entry.descriptionData)
    );
  });
}

function parseFoundationSelections(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
}

function buildFoundationValueForType(
  typeName: string,
  installedCyberware: Array<{ name: string; type: string }>,
) {
  const normalizedType = typeName.trim().toLowerCase();
  const foundationEntries = installedCyberware.filter((item) => {
    const entry = findCyberwareCatalogEntry(item.name);
    if (!entry) {
      return false;
    }

    return (
      entry.type.trim().toLowerCase() === normalizedType &&
      isFoundationCyberwareDescription(entry.descriptionData)
    );
  });

  if (foundationEntries.length === 0) {
    return "";
  }

  if (normalizedType === "cyberlimbs") {
    const keys = ["A1", "A2", "L1", "L2"].slice(0, foundationEntries.length);
    return keys.join(",");
  }

  if (normalizedType === "cyberoptics") {
    const keys = ["E1", "E2"].slice(0, foundationEntries.length);
    return keys.join(",");
  }

  return "Yes";
}

function makeInitialSheet(sheet: CharacterSheet): CharacterSheet {
  const fallback = createEmptyCharacterSheet();

  const normalizeHl = (value: string) => (value.trim().length > 0 ? value : "0");
  const normalizeOptionSlots = (value: string) => (value.trim().length > 0 ? value : "0");

  const parseHl = (value: string) => {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  };

  const applyCatalogToCyberwareRow = (row: CharacterSheet["cyberwareRows"][number]) => {
    if (row.name.trim().length === 0) {
      return {
        ...row,
        type: "",
        notes: "",
        hl: "",
      };
    }

    const catalogEntry = findCyberwareCatalogEntry(row.name);
    if (!catalogEntry) {
      return {
        ...row,
        hl: normalizeHl(row.hl),
      };
    }

    return {
      ...row,
      type: catalogEntry.type,
      notes: catalogEntry.descriptionData,
      hl: normalizeHlToNumberString(row.hl, parseHlRule(catalogEntry.hl).defaultValue),
    };
  };

  const withComputedCyberwareHl = (nextSheet: CharacterSheet): CharacterSheet => {
    const cyberwareRows = nextSheet.cyberwareRows.map((row) => applyCatalogToCyberwareRow(row));
    const installedCyberware = cyberwareRows.map((row) => ({
      name: row.name,
      type: row.type,
    }));

    const cyberwareTypeRows = nextSheet.cyberwareTypeRows.map((typeRow) => ({
      ...typeRow,
      optionSlots: String(getAvailableOptionSlotsForType(typeRow.name, installedCyberware)),
      foundation: buildFoundationValueForType(typeRow.name, installedCyberware),
      hl: String(
        cyberwareRows
          .filter((row) => row.type === typeRow.name)
          .reduce((total, row) => total + parseHl(row.hl), 0),
      ),
    }));
    const totalCyberwareHl = cyberwareTypeRows.reduce((total, row) => total + parseHl(row.hl), 0);

    return {
      ...nextSheet,
      cyberwareRows,
      cyberwareTypeRows,
      humanityTrack: {
        ...nextSheet.humanityTrack,
        totalHl: String(totalCyberwareHl),
      },
    };
  };

  return withComputedCyberwareHl({
    ...fallback,
    ...sheet,
    inventoryItems:
      (sheet.inventoryItems?.length ?? 0) > 0
        ? sheet.inventoryItems
            .map((item) => ({
              name: item.name?.trim() ?? "",
              source: item.source ?? "Custom",
              description: item.description?.trim() ?? "",
            }))
            .filter((item) => item.name.length > 0)
        : (sheet.gear ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => line.replace(/^[-*]\s*/, ""))
            .map((name) => ({
              name,
              source: "Custom" as const,
              description: "",
            })),
    gear:
      (sheet.inventoryItems?.length ?? 0) > 0
        ? buildGearTextFromInventoryItems(
            sheet.inventoryItems
              .map((item) => ({
                name: item.name?.trim() ?? "",
                source: item.source ?? "Custom",
                description: item.description?.trim() ?? "",
              }))
              .filter((item) => item.name.length > 0),
          )
        : sheet.gear ?? "",
    stats: { ...fallback.stats, ...sheet.stats },
    combat: {
      ...fallback.combat,
      ...sheet.combat,
      body: {
        ...fallback.combat.body,
        ...sheet.combat.body,
      },
    },
    weaponRows:
      (sheet.weaponRows.length > 0 ? sheet.weaponRows : fallback.weaponRows).filter(
        (row) => !isWeaponRowEmpty(row),
      ),
    weaponsArmorRows:
      sheet.weaponsArmorRows.length > 0 ? sheet.weaponsArmorRows : fallback.weaponsArmorRows,
    cybernetics: sheet.cybernetics.length > 0 ? sheet.cybernetics : fallback.cybernetics,
    cyberwareTypeRows: (sheet.cyberwareTypeRows.length > 0
      ? sheet.cyberwareTypeRows
      : fallback.cyberwareTypeRows
    ).map((row) => ({
      ...row,
      optionSlots: normalizeOptionSlots(row.optionSlots),
      hl: normalizeHl(row.hl),
    })),
    cyberwareRows: (sheet.cyberwareRows.length > 0 ? sheet.cyberwareRows : fallback.cyberwareRows)
      .filter((row) => !isCyberwareRowEmpty(row))
      .map((row) => ({
        ...row,
        hl: row.hl.trim().length > 0 ? normalizeHl(row.hl) : "",
      })),
    skills: { ...fallback.skills, ...sheet.skills },
  });
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <div className="h-3 w-full rounded-full bg-[linear-gradient(90deg,#3b82f6_0%,#1e3a8a_50%,#3b82f6_100%)] shadow-[0_4px_14px_rgba(30,58,138,0.22)]" />
      <div className="mt-2 flex items-end justify-between gap-3">
        <h2 className="font-mono text-xl font-semibold uppercase tracking-[0.15em] text-slate-950">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function SheetInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-700"
      />
    </label>
  );
}

function SheetTextarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-700"
      />
    </label>
  );
}

function PencilRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-900">
      <span className="min-w-0 shrink-0 font-semibold uppercase tracking-[0.06em]">{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-28 border-0 bg-transparent p-0 text-right text-sm outline-none focus:ring-0"
      />
    </div>
  );
}

function SkillSectionTable({
  title,
  items,
  values,
  onChange,
  onSkillClick,
}: {
  title: string;
  items: readonly string[];
  values: Record<string, string>;
  onChange: (label: string, value: string) => void;
  onSkillClick: (label: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-base font-semibold uppercase tracking-[0.14em] text-slate-950">
        {title}
      </h3>
      <div className="space-y-1.5">
        {items.map((label) => (
          <div key={label} className="flex items-center gap-2 text-[13px] leading-5 text-slate-900">
            <button
              type="button"
              onClick={() => onSkillClick(label)}
              className="shrink-0 rounded px-1 text-left underline decoration-dotted underline-offset-2 hover:bg-blue-50 hover:text-blue-900"
            >
              {label}
            </button>
            <span className="flex-1 border-b border-dotted border-slate-400" />
            <input
              type="text"
              value={values[label] ?? ""}
              onChange={(event) => onChange(label, event.target.value)}
              className="w-9 border-0 bg-transparent p-0 text-right text-sm outline-none focus:ring-0"
            />
            <span className="w-2 shrink-0 text-right">]</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.15rem] border-2 border-slate-900 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <SectionHeader title={title} subtitle={subtitle} />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="mt-1 rounded-full border border-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-100"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? <div className="space-y-3">{children}</div> : null}
    </section>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <SectionHeader title={title} subtitle={subtitle} />
    </div>
  );
}

export default function MemberProfileForm({
  initialUser,
  saveEndpoint = "/api/member/profile",
  title = "Player Character Sheet",
  subtitle = "Reference sheet layout for a member character.",
  submitLabel = "Save sheet",
  canEdit = true,
  canEditReadOnlyFields = false,
}: Props) {
  const [sheet, setSheet] = useState<CharacterSheet>(() => makeInitialSheet(initialUser.sheet));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [activeSkillLabel, setActiveSkillLabel] = useState<string | null>(null);
  const [activeInventoryItem, setActiveInventoryItem] = useState<CharacterSheet["inventoryItems"][number] | null>(null);
  const [pendingCyberwareHlChoice, setPendingCyberwareHlChoice] = useState<Record<number, boolean>>({});
  const [showInventory, setShowInventory] = useState(false);
  const [inventorySource, setInventorySource] = useState<"Cyberware" | "Weapons">("Cyberware");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState("");
  const [showCustomInventoryModal, setShowCustomInventoryModal] = useState(false);
  const [customInventoryName, setCustomInventoryName] = useState("");
  const [customInventoryDescription, setCustomInventoryDescription] = useState("");
  const [pendingInventoryRemovalIndex, setPendingInventoryRemovalIndex] = useState<number | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [showCampaignTrack, setShowCampaignTrack] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showLoadoutSections, setShowLoadoutSections] = useState({
    weapons: true,
    cyberwareType: true,
    cyberwareName: true,
    armor: true,
    economy: true,
  });
  const lastSavedSheetRef = useRef<string>(JSON.stringify(makeInitialSheet(initialUser.sheet)));
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef<string | null>(null);
  const saveSheetRef = useRef<(nextSheet: CharacterSheet) => Promise<boolean>>(async () => true);
  const cyberwareCatalogNames = new Set(CYBERWARE_CATALOG.map((entry) => entry.name.trim().toLowerCase()));
  const installedCyberwareNames = sheet.cyberwareRows.map((row) => row.name);
  const parsedBodyStat = Number.parseInt(sheet.stats.BODY, 10);
  const bodyStat = Number.isFinite(parsedBodyStat) ? parsedBodyStat : undefined;
  const maxHp = 40;
  const seriouslyWoundedThreshold = maxHp > 0 ? Math.floor(maxHp / 2) : 0;
  const canOverrideReadOnly = canEdit && canEditReadOnlyFields;
  const inventoryEditable = canEdit;
  const activeSkillDescription = activeSkillLabel ? SKILL_DESCRIPTIONS[activeSkillLabel] ?? "No description found for this skill." : null;
  const inventoryOptions =
    inventorySource === "Cyberware" ? CYBERWARE_INVENTORY_OPTIONS : WEAPON_INVENTORY_OPTIONS;
  const inventoryItems = sheet.inventoryItems;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!activeSkillLabel && !activeInventoryItem && !showCustomInventoryModal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveSkillLabel(null);
        setActiveInventoryItem(null);
        setShowCustomInventoryModal(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSkillLabel, activeInventoryItem, showCustomInventoryModal]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const hasOpenModal = Boolean(activeSkillLabel || activeInventoryItem || showCustomInventoryModal);
    const previousOverflow = document.body.style.overflow;

    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted, activeSkillLabel, activeInventoryItem, showCustomInventoryModal]);

  const normalizeHl = (value: string) => (value.trim().length > 0 ? value : "0");
  const parseHl = (value: string) => {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  };

  const applyCatalogToCyberwareRow = (row: CharacterSheet["cyberwareRows"][number]) => {
    if (row.name.trim().length === 0) {
      return {
        ...row,
        type: "",
        notes: "",
        hl: "",
      };
    }

    const catalogEntry = findCyberwareCatalogEntry(row.name);
    if (!catalogEntry) {
      return {
        ...row,
        hl: normalizeHl(row.hl),
      };
    }

    return {
      ...row,
      type: catalogEntry.type,
      notes: catalogEntry.descriptionData,
      hl: normalizeHlToNumberString(row.hl, parseHlRule(catalogEntry.hl).defaultValue),
    };
  };

  const getHlTextSizeClass = (hl: string) => (hl.trim().length > 8 ? "text-xs" : "text-sm");

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Unable to read image file."));
      };
      reader.onerror = () => reject(new Error("Unable to read image file."));
      reader.readAsDataURL(file);
    });
  }

  async function optimizePortraitImage(file: File): Promise<string> {
    const sourceDataUrl = await fileToDataUrl(file);

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to process image file."));
      nextImage.src = sourceDataUrl;
    });

    const maxDimension = 1200;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return sourceDataUrl;
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function handlePortraitUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!canEdit) {
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("Image is too large. Please use a file under 4MB.");
      return;
    }

    try {
      const optimizedDataUrl = await optimizePortraitImage(file);
      setError(null);
      setSuccess("Portrait updated.");
      setSheet((current) => ({
        ...current,
        portraitUrl: optimizedDataUrl,
      }));
    } catch {
      setError("Unable to read image file.");
    }
  }

  function toggleLoadoutSection(section: keyof typeof showLoadoutSections) {
    setShowLoadoutSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function recalculateCyberwareHl(nextSheet: CharacterSheet): CharacterSheet {
    const cyberwareRows = nextSheet.cyberwareRows.map((row) => applyCatalogToCyberwareRow(row));
    const installedCyberware = cyberwareRows.map((row) => ({
      name: row.name,
      type: row.type,
    }));
    const cyberwareTypeRows = nextSheet.cyberwareTypeRows.map((typeRow) => ({
      ...typeRow,
      optionSlots: String(getAvailableOptionSlotsForType(typeRow.name, installedCyberware)),
      foundation: buildFoundationValueForType(typeRow.name, installedCyberware),
      hl: String(
        cyberwareRows
          .filter((row) => row.type === typeRow.name)
          .reduce((total, row) => total + parseHl(row.hl), 0),
      ),
    }));
    const totalCyberwareHl = cyberwareTypeRows.reduce((total, row) => total + parseHl(row.hl), 0);

    return {
      ...nextSheet,
      cyberwareRows,
      cyberwareTypeRows,
      humanityTrack: {
        ...nextSheet.humanityTrack,
        totalHl: String(totalCyberwareHl),
      },
    };
  }

  function updateStat(statKey: (typeof STAT_KEYS)[number], value: string) {
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      stats: {
        ...current.stats,
        [statKey]: value,
      },
    }));
  }

  function updateCombat(field: keyof CharacterSheet["combat"], value: string) {
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      combat: {
        ...current.combat,
        [field]: value,
      },
    }));
  }

  function updateBody(bodyKey: (typeof BODY_KEYS)[number], value: string) {
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      combat: {
        ...current.combat,
        body: {
          ...current.combat.body,
          [bodyKey]: value,
        },
      },
    }));
  }

  function updateWeaponRow(index: number, field: keyof CharacterSheet["weaponRows"][number], value: string) {
    return;
  }

  function openDiceFromDamageValue(value: string) {
    const damageMatch = value.trim().match(/(\d+)\s*d\s*(6|10)/i);
    if (!damageMatch) {
      return;
    }

    const count = Number.parseInt(damageMatch[1], 10);
    const sides = Number.parseInt(damageMatch[2], 10) as 6 | 10;
    if (!Number.isFinite(count) || (sides !== 6 && sides !== 10)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(OPEN_DICE_ROLLER_EVENT, {
        detail: {
          count,
          sides,
          autoRoll: false,
        },
      }),
    );
  }

  function updateArmorRow(index: number, field: keyof CharacterSheet["armorRows"][number], value: string) {
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      armorRows: current.armorRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
  }

  function addWeaponRow() {
    if (!canOverrideReadOnly) {
      return;
    }

    setSheet((current) => ({
      ...current,
      weaponRows: [...current.weaponRows, createEmptyWeaponRow()],
    }));
  }

  function removeWeaponRow() {
    if (!canOverrideReadOnly) {
      return;
    }

    setSheet((current) => {
      if (current.weaponRows.length === 0) {
        return current;
      }

      return {
        ...current,
        weaponRows: current.weaponRows.slice(0, -1),
      };
    });
  }

  function addArmorRow() {
    if (!canOverrideReadOnly) {
      return;
    }

    setSheet((current) => ({
      ...current,
      armorRows: [...current.armorRows, createEmptyArmorRow()],
    }));
  }

  function removeArmorRow() {
    if (!canOverrideReadOnly) {
      return;
    }

    setSheet((current) => {
      if (current.armorRows.length === 0) {
        return current;
      }

      return {
        ...current,
        armorRows: current.armorRows.slice(0, -1),
      };
    });
  }

  function updateCyberwareTypeRow(
    index: number,
    field: keyof CharacterSheet["cyberwareTypeRows"][number],
    value: string,
  ) {
    if (!canEdit) {
      return;
    }

    if ((field === "hl" || field === "optionSlots") && !canOverrideReadOnly) {
      return;
    }

    if (canOverrideReadOnly && (field === "hl" || field === "optionSlots")) {
      setSheet((current) => ({
        ...current,
        cyberwareTypeRows: current.cyberwareTypeRows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, [field]: value } : row,
        ),
      }));
      return;
    }

    setSheet((current) =>
      recalculateCyberwareHl({
        ...current,
        cyberwareTypeRows: current.cyberwareTypeRows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, [field]: value } : row,
        ),
      }),
    );
  }

  function updateCyberwareRow(
    index: number,
    field: keyof CharacterSheet["cyberwareRows"][number],
    value: string,
  ) {
    if (!canOverrideReadOnly) {
      return;
    }

    if (field === "name") {
      const catalogEntry = findCyberwareCatalogEntry(value);
      setPendingCyberwareHlChoice((current) => ({
        ...current,
        [index]: Boolean(catalogEntry),
      }));
    }

    setSheet((current) =>
      recalculateCyberwareHl({
        ...current,
        cyberwareRows: current.cyberwareRows.map((row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                ...(field === "name"
                  ? {
                      hl: findCyberwareCatalogEntry(value) ? "" : normalizeHl(row.hl),
                    }
                  : {}),
                [field]: field === "hl" ? normalizeHl(value) : value,
              }
            : row,
        ),
      }),
    );
  }

  function applyCyberwareHlChoice(index: number, mode: "default" | "roll") {
    if (!canOverrideReadOnly) {
      return;
    }

    setSheet((current) => {
      const row = current.cyberwareRows[index];
      if (!row) {
        return current;
      }

      const catalogEntry = findCyberwareCatalogEntry(row.name);
      if (!catalogEntry) {
        return current;
      }

      const hlRule = parseHlRule(catalogEntry.hl);
      const nextHlValue =
        mode === "roll" && hlRule.roll
          ? String(hlRule.roll())
          : String(hlRule.defaultValue);

      const nextSheet = recalculateCyberwareHl({
        ...current,
        cyberwareRows: current.cyberwareRows.map((currentRow, rowIndex) =>
          rowIndex === index
            ? {
                ...currentRow,
                hl: normalizeHl(nextHlValue),
              }
            : currentRow,
        ),
      });

      return nextSheet;
    });

    setPendingCyberwareHlChoice((current) => ({
      ...current,
      [index]: false,
    }));
  }

  function addCyberwareRow() {
    if (!canOverrideReadOnly) {
      return;
    }

    setSheet((current) =>
      recalculateCyberwareHl({
        ...current,
        cyberwareRows: [...current.cyberwareRows, createEmptyCyberwareRow()],
      }),
    );
  }

  function removeCyberwareRow() {
    if (!canOverrideReadOnly) {
      return;
    }

    setPendingCyberwareHlChoice({});
    setSheet((current) => {
      if (current.cyberwareRows.length === 0) {
        return current;
      }

      return recalculateCyberwareHl({
        ...current,
        cyberwareRows: current.cyberwareRows.slice(0, -1),
      });
    });
  }

  function isValidCyberwareName(name: string) {
    return name.trim().length === 0 || cyberwareCatalogNames.has(name.trim().toLowerCase());
  }

  function updateHumanityTrack(
    field: keyof CharacterSheet["humanityTrack"],
    value: string,
  ) {
    if (!canEdit) {
      return;
    }

    if (field === "totalHl") {
      return;
    }

    setSheet((current) => ({
      ...current,
      humanityTrack: {
        ...current.humanityTrack,
        [field]: value,
      },
    }));
  }

  function updateEconomy(field: keyof CharacterSheet["economy"], value: string) {
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      economy: {
        ...current.economy,
        [field]: value,
      },
    }));
  }

  function updateSkill(label: string, value: string) {
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      skills: {
        ...current.skills,
        [label]: value,
      },
    }));
  }

  function addSelectedItemToInventory() {
    if (!inventoryEditable) {
      return;
    }

    const itemName = selectedInventoryItem.trim();
    if (!itemName) {
      return;
    }

    const selectedOption = inventoryOptions.find((option) => option.name === itemName);
    if (!selectedOption) {
      return;
    }

    setSheet((current) => {
      const nextInventoryItems = [
        ...current.inventoryItems,
        {
          name: selectedOption.name,
          source: selectedOption.source,
          description: selectedOption.description,
        },
      ];

      return {
        ...current,
        inventoryItems: nextInventoryItems,
        gear: buildGearTextFromInventoryItems(nextInventoryItems),
      };
    });

    setSelectedInventoryItem("");
  }

  function addCustomInventoryItem() {
    if (!inventoryEditable) {
      return;
    }

    const trimmedName = customInventoryName.trim();
    const trimmedDescription = customInventoryDescription.trim();
    if (trimmedName.length === 0) {
      return;
    }

    setSheet((current) => {
      const nextInventoryItems = [
        ...current.inventoryItems,
        {
          name: trimmedName,
          source: "Custom" as const,
          description: trimmedDescription,
        },
      ];

      return {
        ...current,
        inventoryItems: nextInventoryItems,
        gear: buildGearTextFromInventoryItems(nextInventoryItems),
      };
    });

    setCustomInventoryName("");
    setCustomInventoryDescription("");
    setShowCustomInventoryModal(false);
  }

  function removeInventoryItem(indexToRemove: number) {
    if (!canEdit) {
      return;
    }

    if (pendingInventoryRemovalIndex !== indexToRemove) {
      setPendingInventoryRemovalIndex(indexToRemove);
      return;
    }

    setSheet((current) => {
      const nextInventoryItems = current.inventoryItems.filter((_, index) => index !== indexToRemove);
      return {
        ...current,
        inventoryItems: nextInventoryItems,
        gear: buildGearTextFromInventoryItems(nextInventoryItems),
      };
    });

    setPendingInventoryRemovalIndex(null);
  }

  function isInventoryItemEquipped(item: CharacterSheet["inventoryItems"][number]) {
    const normalizedName = item.name.trim().toLowerCase();
    if (!normalizedName) {
      return false;
    }

    if (item.source === "Weapons") {
      return sheet.weaponRows.some((row) => row.name.trim().toLowerCase() === normalizedName);
    }

    if (item.source === "Cyberware") {
      return sheet.cyberwareRows.some((row) => row.name.trim().toLowerCase() === normalizedName);
    }

    return false;
  }

  function equipInventoryItem(item: CharacterSheet["inventoryItems"][number]) {
    if (!canEdit) {
      return;
    }

    const normalizedName = item.name.trim().toLowerCase();
    const alreadyEquipped = isInventoryItemEquipped(item);

    if (item.source === "Weapons") {
      if (alreadyEquipped) {
        setError(null);
        setSuccess(`${item.name} unequipped from weapons.`);
        setSheet((current) => {
          const targetIndex = current.weaponRows.findIndex((row) => row.name.trim().toLowerCase() === normalizedName);
          if (targetIndex < 0) {
            return current;
          }

          const nextRows = current.weaponRows.filter((_, index) => index !== targetIndex);

          return {
            ...current,
            weaponRows: nextRows,
          };
        });

        return;
      }

      const weaponPreset = WEAPON_EQUIP_PRESETS.get(normalizedName);
      if (!weaponPreset) {
        setError(`Could not find weapon data for ${item.name}.`);
        return;
      }

      setError(null);
      setSuccess(`${weaponPreset.name} equipped to weapons.`);
      setSheet((current) => {
        const nextRow: CharacterSheet["weaponRows"][number] = {
          name: weaponPreset.name,
          dmg: weaponPreset.dmg,
          rof: weaponPreset.rof,
          hands: weaponPreset.hands,
          con: weaponPreset.con,
          mag: weaponPreset.mag,
          ammo: weaponPreset.ammo,
          notes: weaponPreset.notes,
        };

        return {
          ...current,
          weaponRows: [...current.weaponRows, nextRow],
        };
      });

      return;
    }

    if (item.source === "Cyberware") {
      if (alreadyEquipped) {
        setError(null);
        setSuccess(`${item.name} unequipped from cyberware.`);
        setSheet((current) => {
          const targetIndex = current.cyberwareRows.findIndex((row) => row.name.trim().toLowerCase() === normalizedName);
          if (targetIndex < 0) {
            return current;
          }

          const nextRows = current.cyberwareRows.filter((_, index) => index !== targetIndex);

          return recalculateCyberwareHl({
            ...current,
            cyberwareRows: nextRows,
          });
        });

        return;
      }

      if (!CYBERWARE_EQUIP_NAMES.has(normalizedName)) {
        setError(`Could not find cyberware data for ${item.name}.`);
        return;
      }

      const catalogEntry = findCyberwareCatalogEntry(item.name);
      if (!catalogEntry) {
        setError(`Could not find cyberware data for ${item.name}.`);
        return;
      }

      const warnings = getCyberwarePrerequisiteWarnings(catalogEntry, {
        installedCyberwareNames: [...installedCyberwareNames, catalogEntry.name],
        bodyStat,
      });

      if (warnings.length > 0) {
        setError(`Cannot equip ${catalogEntry.name}. ${warnings.join(" ")}`);
        return;
      }

      setError(null);
      setSuccess(`${catalogEntry.name} equipped to cyberware.`);
      setSheet((current) => {
        const nextRow: CharacterSheet["cyberwareRows"][number] = {
          name: catalogEntry.name,
          type: catalogEntry.type,
          notes: catalogEntry.descriptionData,
          hl: "",
        };

        const nextSheet = recalculateCyberwareHl({
          ...current,
          cyberwareRows: [nextRow, ...current.cyberwareRows],
        });

        return nextSheet;
      });

      return;
    }

    setError(`Equip is only available for weapon and cyberware items.`);
  }

  useEffect(() => {
    saveSheetRef.current = async (nextSheet: CharacterSheet) => {
      const serializedNextSheet = JSON.stringify(nextSheet);
      if (serializedNextSheet === lastSavedSheetRef.current) {
        return true;
      }

      if (saveInFlightRef.current) {
        queuedSaveRef.current = serializedNextSheet;
        return true;
      }

      saveInFlightRef.current = true;
      setSaving(true);
      setError(null);

      try {
        const response = await fetch(saveEndpoint, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sheet: nextSheet }),
        });

        const data = (await response.json()) as UpdateResponse;
        if (!response.ok || !data.user) {
          throw new Error(data.error ?? "Failed to save changes.");
        }

        const nextSavedSheet = makeInitialSheet(data.user.sheet ?? nextSheet);
        lastSavedSheetRef.current = JSON.stringify(nextSavedSheet);
        setSheet(nextSavedSheet);
        setSuccess("Character sheet saved.");
        return true;
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to save changes.");
        return false;
      } finally {
        setSaving(false);
        saveInFlightRef.current = false;

        const queuedSave = queuedSaveRef.current;
        queuedSaveRef.current = null;
        if (queuedSave && queuedSave !== lastSavedSheetRef.current) {
          const parsedQueuedSave = JSON.parse(queuedSave) as CharacterSheet;
          void saveSheetRef.current(parsedQueuedSave);
        }
      }
    };
  }, [saveEndpoint]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    await saveSheetRef.current(sheet);
  }

  useEffect(() => {
    if (!canEdit) {
      return;
    }

    const serializedSheet = JSON.stringify(sheet);
    if (serializedSheet === lastSavedSheetRef.current) {
      return;
    }

    setSuccess(null);

    void saveSheetRef.current(sheet);
  }, [canEdit, sheet]);

  useEffect(() => {
    lastSavedSheetRef.current = JSON.stringify(makeInitialSheet(initialUser.sheet));
  }, [initialUser.sheet]);

  return (
    <section className="w-full rounded-[2rem] border-4 border-slate-950 bg-[#f5f5f5] p-3 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-16 w-full rounded-tl-[2rem] rounded-tr-[4rem] bg-[linear-gradient(135deg,#1e3a8a_0%,#1e40af_60%,#1e3a8a_100%)] px-5 py-4 text-white shadow-[0_4px_14px_rgba(30,58,138,0.28)]">
                <div className="text-4xl font-black italic tracking-[-0.08em]">NEEDLES</div>
              </div>
              <div className="pl-4 text-center text-[11px] font-bold uppercase tracking-[0.8em] text-slate-700">
                TTRPG
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-900">
              {title}
            </p>
            <p className="text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Handle
            </span>
            <input
              type="text"
              value={sheet.handle}
              onChange={(event) => {
                if (!canEdit) {
                  return;
                }

                setSheet((current) => ({ ...current, handle: event.target.value }));
              }}
                className="w-full rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-700"
              placeholder="Handle"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Description
            </span>
            <textarea
              value={sheet.description}
              onChange={(event) => {
                if (!canEdit) {
                  return;
                }

                setSheet((current) => ({ ...current, description: event.target.value }));
              }}
              rows={4}
              className="w-full rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-700"
              placeholder="Description"
            />
          </label>
        </div>

        <div className="rounded-[1.5rem] border-4 border-slate-900 bg-white p-2">
          <div className="flex h-full min-h-[18rem] items-center justify-center rounded-[1.15rem] border-2 border-dashed border-slate-300 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.02),transparent_55%)] p-4 text-center">
            {sheet.portraitUrl ? (
              <img
                src={sheet.portraitUrl}
                alt="Character portrait preview"
                className="h-full w-full rounded-[1rem] object-cover"
              />
            ) : (
              <div className="text-sm text-slate-400">Image of Character</div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className={`rounded-md border border-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${canEdit ? "cursor-pointer bg-white text-slate-800 hover:bg-slate-100" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}>
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={handlePortraitUpload}
                disabled={!canEdit}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  return;
                }

                setSheet((current) => ({ ...current, portraitUrl: "" }));
                setSuccess("Portrait removed.");
              }}
              disabled={!canEdit || !sheet.portraitUrl}
              className="rounded-md border border-slate-900 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">Use JPG, PNG, GIF, or WEBP up to 4MB.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 overflow-x-hidden">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0 space-y-5">
            <section className="rounded-[1.15rem] border-2 border-slate-900 bg-white p-4">
              <SectionHeader title="STATS" subtitle="Core attributes" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3">
                {STAT_KEYS.map((statKey) => (
                  <PencilRow
                    key={statKey}
                    label={statKey}
                    value={sheet.stats[statKey]}
                    onChange={(value) => updateStat(statKey, value)}
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4 rounded-[1.15rem] border-2 border-slate-900 bg-white p-4">
                <div className="grid gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  <div>Role</div>
                  <input
                    type="text"
                    value={sheet.combat.location}
                    onChange={(event) => updateCombat("location", event.target.value)}
                    className="rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-700"
                    placeholder="Role"
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <SheetInput
                    label="Armor SP"
                    value={sheet.combat.armorSp}
                    onChange={(value) => updateCombat("armorSp", value)}
                    inputMode="numeric"
                    placeholder="0"
                  />
                  <SheetInput
                    label="Save"
                    value={sheet.combat.save}
                    onChange={(value) => updateCombat("save", value)}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {BODY_KEYS.map((bodyKey) => (
                    <div key={bodyKey} className="rounded-md border border-slate-900 bg-white px-2 py-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span>{bodyKey}</span>
                        <span className="text-slate-400">[]</span>
                      </div>
                      <input
                        type="text"
                        value={sheet.combat.body[bodyKey]}
                        onChange={(event) => updateBody(bodyKey, event.target.value)}
                        className="w-full border-0 bg-transparent p-0 text-sm text-slate-950 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.15rem] border-2 border-slate-900 bg-white p-4">
                <SectionHeader title="HP" subtitle="Wounded conditions" />
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SheetInput
                      label="Current HP"
                      value={sheet.combat.currentHp}
                      onChange={(value) => updateCombat("currentHp", value)}
                      inputMode="numeric"
                      placeholder={maxHp > 0 ? String(maxHp) : "0"}
                    />
                    <div className="rounded-md border-2 border-slate-900 bg-slate-50 px-3 py-2 text-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Max HP
                      </div>
                      <div className="mt-1 text-base font-semibold text-slate-950">{maxHp > 0 ? maxHp : "-"}</div>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    <p>
                      <span className="font-semibold">Seriously Wounded:</span>{" "}
                      {maxHp > 0 ? `HP <= ${seriouslyWoundedThreshold}` : "Set BODY to calculate"}
                    </p>
                    <p>
                      <span className="font-semibold">Mortally Wounded:</span> HP {"<="} 0
                    </p>
                    <p>
                      <span className="font-semibold">Death Save:</span> Required while at 0 HP or less
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[1.15rem] border-2 border-slate-900 bg-white p-4">
              <PanelHeader title="WEAPONS, ARMOR, CYBERWARE & GEAR" subtitle="Reference-style panels" />
              <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_1.05fr]">
                <div className="min-w-0 space-y-4">
                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Weapons
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                          onClick={() => toggleLoadoutSection("weapons")}
                        >
                          {showLoadoutSections.weapons ? "Hide" : "Show"}
                        </button>
                        {canOverrideReadOnly && showLoadoutSections.weapons ? (
                          <>
                            <button
                              type="button"
                              className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                              onClick={addWeaponRow}
                            >
                              Add Row
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={removeWeaponRow}
                              disabled={sheet.weaponRows.length === 0}
                            >
                              Remove Row
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {showLoadoutSections.weapons ? (
                    <>
                    <div className="space-y-3 md:hidden">
                      {sheet.weaponRows.map((row, index) => (
                        <div key={`weapon-mobile-${index}`} className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-3 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Row {index + 1}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Weapon Name
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-slate-50 px-3 py-2 text-sm" value={row.name} readOnly aria-readonly="true" tabIndex={-1} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              DMG
                              <button
                                type="button"
                                onClick={() => openDiceFromDamageValue(row.dmg)}
                                className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-slate-50 px-3 py-2 text-left text-sm text-slate-900 underline decoration-dotted underline-offset-2 hover:bg-blue-50"
                              >
                                {row.dmg || "-"}
                              </button>
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              ROF
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-slate-50 px-3 py-2 text-sm" value={row.rof} readOnly aria-readonly="true" tabIndex={-1} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Hands
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-slate-50 px-3 py-2 text-sm" value={row.hands} readOnly aria-readonly="true" tabIndex={-1} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Con
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-slate-50 px-3 py-2 text-sm" value={row.con} readOnly aria-readonly="true" tabIndex={-1} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Mag
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-slate-50 px-3 py-2 text-sm" value={row.mag} readOnly aria-readonly="true" tabIndex={-1} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Ammo
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-slate-50 px-3 py-2 text-sm" value={row.ammo} readOnly aria-readonly="true" tabIndex={-1} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden w-full space-y-2 overflow-x-auto md:block">
                      <div className="grid w-full grid-cols-[minmax(8rem,2.2fr)_minmax(2.5rem,0.7fr)_minmax(2.2rem,0.55fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)] gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        <span>Weapon Name</span>
                        <span>DMG</span>
                        <span>ROF</span>
                        <span>Hands</span>
                        <span>Con</span>
                        <span>Mag</span>
                        <span>Ammo</span>
                      </div>
                      {sheet.weaponRows.map((row, index) => (
                        <div key={index} className="grid w-full grid-cols-[minmax(8rem,2.2fr)_minmax(2.5rem,0.7fr)_minmax(2.2rem,0.55fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)] gap-2">
                          <input className="min-w-0 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-sm" value={row.name} readOnly aria-readonly="true" tabIndex={-1} />
                          <button
                            type="button"
                            onClick={() => openDiceFromDamageValue(row.dmg)}
                            className="min-w-0 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-left text-sm text-slate-900 underline decoration-dotted underline-offset-2 hover:bg-blue-50"
                          >
                            {row.dmg || "-"}
                          </button>
                          <input className="min-w-0 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-sm" value={row.rof} readOnly aria-readonly="true" tabIndex={-1} />
                          <input className="min-w-0 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-sm" value={row.hands} readOnly aria-readonly="true" tabIndex={-1} />
                          <input className="min-w-0 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-sm" value={row.con} readOnly aria-readonly="true" tabIndex={-1} />
                          <input className="min-w-0 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-sm" value={row.mag} readOnly aria-readonly="true" tabIndex={-1} />
                          <input className="min-w-0 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-sm" value={row.ammo} readOnly aria-readonly="true" tabIndex={-1} />
                        </div>
                      ))}
                    </div>
                    </>
                    ) : null}
                  </div>

                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Cyberware Type
                      </h3>
                      <button
                        type="button"
                        className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                        onClick={() => toggleLoadoutSection("cyberwareType")}
                      >
                        {showLoadoutSections.cyberwareType ? "Hide" : "Show"}
                      </button>
                    </div>
                    {showLoadoutSections.cyberwareType ? (
                    <div className="space-y-2 overflow-x-auto">
                      <div className="grid min-w-[34rem] grid-cols-[1.6fr_0.8fr_0.8fr_0.6fr] gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        <span>Type</span>
                        <span>Option Slots</span>
                        <span>Foundation</span>
                        <span>HL</span>
                      </div>
                      {sheet.cyberwareTypeRows.map((row, index) => (
                        <div key={index} className="grid min-w-[34rem] grid-cols-[1.6fr_0.8fr_0.8fr_0.6fr] gap-2">
                          <input
                            className={`min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                            value={row.name}
                            onChange={(event) => updateCyberwareTypeRow(index, "name", event.target.value)}
                            readOnly={!canOverrideReadOnly}
                            aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                            tabIndex={canOverrideReadOnly ? 0 : -1}
                          />
                          <input
                            className={`min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                            value={row.optionSlots}
                            onChange={(event) => updateCyberwareTypeRow(index, "optionSlots", event.target.value)}
                            readOnly={!canOverrideReadOnly}
                            aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                            tabIndex={canOverrideReadOnly ? 0 : -1}
                          />
                          {row.name.trim().toLowerCase() === "cyberlimbs" ? (
                            <div className="min-h-9 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                              <div className="flex items-center justify-between gap-2">
                                <span>Arms</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("A1")}
                                    disabled
                                    className="h-3.5 w-3.5 cursor-not-allowed accent-blue-800"
                                  />
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("A2")}
                                    disabled
                                    className="h-3.5 w-3.5 cursor-not-allowed accent-blue-800"
                                  />
                                </div>
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <span>Legs</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("L1")}
                                    disabled
                                    className="h-3.5 w-3.5 cursor-not-allowed accent-blue-800"
                                  />
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("L2")}
                                    disabled
                                    className="h-3.5 w-3.5 cursor-not-allowed accent-blue-800"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : row.name.trim().toLowerCase() === "cyberoptics" ? (
                            <div className="min-h-9 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                              <div className="flex items-center justify-between gap-2">
                                <span>Eyes</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("E1")}
                                    disabled
                                    className="h-3.5 w-3.5 cursor-not-allowed accent-blue-800"
                                  />
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("E2")}
                                    disabled
                                    className="h-3.5 w-3.5 cursor-not-allowed accent-blue-800"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className="flex min-h-9 items-center justify-center rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                              <input
                                type="checkbox"
                                checked={["true", "yes", "1", "checked", "x"].includes(row.foundation.trim().toLowerCase())}
                                disabled
                                className="h-4 w-4 cursor-not-allowed accent-blue-800"
                              />
                            </label>
                          )}
                          <input
                            className={`min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                            value={row.hl}
                            onChange={(event) => updateCyberwareTypeRow(index, "hl", event.target.value)}
                            readOnly={!canOverrideReadOnly}
                            aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                            tabIndex={canOverrideReadOnly ? 0 : -1}
                          />
                        </div>
                      ))}
                    </div>
                    ) : null}
                  </div>

                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Cyberware Name
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                          onClick={() => toggleLoadoutSection("cyberwareName")}
                        >
                          {showLoadoutSections.cyberwareName ? "Hide" : "Show"}
                        </button>
                        {canOverrideReadOnly && showLoadoutSections.cyberwareName ? (
                          <>
                            <button
                              type="button"
                              className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                              onClick={addCyberwareRow}
                            >
                              Add Row
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={removeCyberwareRow}
                              disabled={sheet.cyberwareRows.length === 0}
                            >
                              Remove Row
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {showLoadoutSections.cyberwareName ? (
                    <>
                    <div className="space-y-3 md:hidden">
                      {sheet.cyberwareRows.map((row, index) => {
                        const matchedCyberwareEntry = findCyberwareCatalogEntry(row.name);
                        const matchedHlRule = matchedCyberwareEntry
                          ? parseHlRule(matchedCyberwareEntry.hl)
                          : null;
                        const prerequisiteWarnings = matchedCyberwareEntry
                          ? getCyberwarePrerequisiteWarnings(matchedCyberwareEntry, {
                              installedCyberwareNames,
                              bodyStat,
                            })
                          : [];
                        const hasUnmetPrerequisites = prerequisiteWarnings.length > 0;
                        const showHlChooser =
                          Boolean(matchedCyberwareEntry) &&
                          !hasUnmetPrerequisites &&
                          (Boolean(pendingCyberwareHlChoice[index]) || row.hl.trim().length === 0);

                        return (
                          <div key={`cyberware-mobile-${index}`} className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-3 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Row {index + 1}
                            </div>
                            <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Cyberware Name
                              <input
                                list="cyberware-name-options"
                                autoComplete="off"
                                className={`mt-1 h-10 w-full min-w-0 rounded-md border px-3 py-2 text-sm ${!isValidCyberwareName(row.name) ? "border-red-600" : hasUnmetPrerequisites ? "border-amber-600" : "border-slate-900"}`}
                                value={row.name}
                                onChange={(event) => updateCyberwareRow(index, "name", event.target.value)}
                              />
                            </label>
                            <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Type
                              <input
                                className={`mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 px-3 py-2 text-sm ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                                value={row.type}
                                onChange={(event) => updateCyberwareRow(index, "type", event.target.value)}
                                readOnly={!canOverrideReadOnly}
                                aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                                tabIndex={canOverrideReadOnly ? 0 : -1}
                              />
                            </label>
                            <div>
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                HL
                              </span>
                              {showHlChooser && matchedHlRule ? (
                                <select
                                  value=""
                                  onChange={(event) => {
                                    if (event.target.value === "default" || event.target.value === "roll") {
                                      applyCyberwareHlChoice(index, event.target.value);
                                    }
                                  }}
                                  className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700"
                                >
                                  <option value="">Choose HL</option>
                                  <option value="default">Default ({matchedHlRule.defaultValueLabel})</option>
                                  {matchedHlRule.rollLabel ? <option value="roll">Roll ({matchedHlRule.rollLabel})</option> : null}
                                </select>
                              ) : (
                                <input
                                  className={`mt-1 h-10 w-full min-w-0 rounded-md border px-3 py-2 ${getHlTextSizeClass(row.hl)} border-slate-900 ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                                  value={row.hl}
                                  onChange={(event) => updateCyberwareRow(index, "hl", event.target.value)}
                                  readOnly={!canOverrideReadOnly}
                                  aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                                  tabIndex={canOverrideReadOnly ? 0 : -1}
                                />
                              )}
                            </div>
                            {hasUnmetPrerequisites ? (
                              <div className="rounded-md border border-amber-500/60 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                                Missing prerequisites: {prerequisiteWarnings.join(" ")}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div className="hidden w-full space-y-2 overflow-x-auto md:block">
                      <div className="grid w-full grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        <span>Cyberware Name</span>
                        <span>Type</span>
                        <span>HL</span>
                      </div>
                      <datalist id="cyberware-name-options">
                        {CYBERWARE_CATALOG.map((entry) => (
                          <option key={entry.name} value={entry.name} />
                        ))}
                      </datalist>
                      {sheet.cyberwareRows.map((row, index) => {
                        const matchedCyberwareEntry = findCyberwareCatalogEntry(row.name);
                        const matchedHlRule = matchedCyberwareEntry
                          ? parseHlRule(matchedCyberwareEntry.hl)
                          : null;
                        const prerequisiteWarnings = matchedCyberwareEntry
                          ? getCyberwarePrerequisiteWarnings(matchedCyberwareEntry, {
                              installedCyberwareNames,
                              bodyStat,
                            })
                          : [];
                        const hasUnmetPrerequisites = prerequisiteWarnings.length > 0;
                        const showHlChooser =
                          Boolean(matchedCyberwareEntry) &&
                          !hasUnmetPrerequisites &&
                          (Boolean(pendingCyberwareHlChoice[index]) || row.hl.trim().length === 0);
                        return (
                        <div key={index} className="grid w-full grid-cols-3 items-center gap-2">
                          <div className="h-9">
                            <input list="cyberware-name-options" autoComplete="off" className={`h-full min-w-0 rounded-md border px-2 py-1 text-sm ${!isValidCyberwareName(row.name) ? "border-red-600" : hasUnmetPrerequisites ? "border-amber-600" : "border-slate-900"}`} value={row.name} onChange={(event) => updateCyberwareRow(index, "name", event.target.value)} />
                          </div>
                          <input
                            className={`h-9 min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                            value={row.type}
                            onChange={(event) => updateCyberwareRow(index, "type", event.target.value)}
                            readOnly={!canOverrideReadOnly}
                            aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                            tabIndex={canOverrideReadOnly ? 0 : -1}
                          />
                          {showHlChooser && matchedHlRule ? (
                            <select
                              value=""
                              onChange={(event) => {
                                if (event.target.value === "default" || event.target.value === "roll") {
                                  applyCyberwareHlChoice(index, event.target.value);
                                }
                              }}
                              className="h-9 min-w-0 rounded-md border border-slate-900 bg-white px-2 py-1 text-xs outline-none focus:border-blue-700"
                            >
                              <option value="">Choose HL</option>
                              <option value="default">Default ({matchedHlRule.defaultValueLabel})</option>
                              {matchedHlRule.rollLabel ? <option value="roll">Roll ({matchedHlRule.rollLabel})</option> : null}
                            </select>
                          ) : (
                            <input
                              className={`h-9 min-w-0 rounded-md border px-2 py-1 ${getHlTextSizeClass(row.hl)} border-slate-900 ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                              value={row.hl}
                              onChange={(event) => updateCyberwareRow(index, "hl", event.target.value)}
                              readOnly={!canOverrideReadOnly}
                              aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                              tabIndex={canOverrideReadOnly ? 0 : -1}
                            />
                          )}
                          {hasUnmetPrerequisites ? (
                            <div className="col-span-3 mt-1 rounded-md border border-amber-500/60 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                              Missing prerequisites: {prerequisiteWarnings.join(" ")}
                            </div>
                          ) : null}
                        </div>
                      )})}
                    </div>
                    </>
                    ) : null}
                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Armor
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                          onClick={() => toggleLoadoutSection("armor")}
                        >
                          {showLoadoutSections.armor ? "Hide" : "Show"}
                        </button>
                        {canOverrideReadOnly && showLoadoutSections.armor ? (
                          <>
                            <button
                              type="button"
                              className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                              onClick={addArmorRow}
                            >
                              Add Row
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={removeArmorRow}
                              disabled={sheet.armorRows.length === 0}
                            >
                              Remove Row
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {showLoadoutSections.armor ? (
                    <>
                    <div className="space-y-3 md:hidden">
                      {sheet.armorRows.map((row, index) => (
                        <div key={`armor-mobile-${index}`} className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-3 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Row {index + 1}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Armor Name
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.name} onChange={(event) => updateArmorRow(index, "name", event.target.value)} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              SP
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.sp} onChange={(event) => updateArmorRow(index, "sp", event.target.value)} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Penalty
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.penalty} onChange={(event) => updateArmorRow(index, "penalty", event.target.value)} />
                            </label>
                          </div>
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            Notes
                            <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.notes} onChange={(event) => updateArmorRow(index, "notes", event.target.value)} />
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="hidden space-y-2 md:block">
                      <div className="grid grid-cols-[2.2fr_0.8fr_0.8fr_1.6fr] gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        <span>Armor Name</span>
                        <span>SP</span>
                        <span>Penalty</span>
                        <span>Notes</span>
                      </div>
                      {sheet.armorRows.map((row, index) => (
                        <div key={index} className="grid grid-cols-[2.2fr_0.8fr_0.8fr_1.6fr] gap-2">
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.name} onChange={(event) => updateArmorRow(index, "name", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.sp} onChange={(event) => updateArmorRow(index, "sp", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.penalty} onChange={(event) => updateArmorRow(index, "penalty", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.notes} onChange={(event) => updateArmorRow(index, "notes", event.target.value)} />
                        </div>
                      ))}
                    </div>
                    </>
                    ) : null}
                  </div>

                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Humanity / Cash / Housing
                      </h3>
                      <button
                        type="button"
                        className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                        onClick={() => toggleLoadoutSection("economy")}
                      >
                        {showLoadoutSections.economy ? "Hide" : "Show"}
                      </button>
                    </div>
                    {showLoadoutSections.economy ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <SheetInput label="Current" value={sheet.humanityTrack.current} onChange={(value) => updateHumanityTrack("current", value)} placeholder="0" />
                        <SheetInput label="Decreased" value={sheet.humanityTrack.decreased} onChange={(value) => updateHumanityTrack("decreased", value)} placeholder="0" />
                        <SheetInput label="Max" value={sheet.humanityTrack.max} onChange={(value) => updateHumanityTrack("max", value)} placeholder="0" />
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Total HL
                          </span>
                          <input
                            type="text"
                            value={sheet.humanityTrack.totalHl}
                            readOnly
                            aria-readonly="true"
                            tabIndex={-1}
                            className="w-full rounded-md border-2 border-slate-900 bg-slate-50 px-3 py-2 text-sm text-slate-950"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <SheetInput label="Cash" value={sheet.economy.cash} onChange={(value) => updateEconomy("cash", value)} placeholder="0" />
                        <SheetInput label="Debts" value={sheet.economy.debts} onChange={(value) => updateEconomy("debts", value)} placeholder="0" />
                        <SheetInput label="Housing" value={sheet.economy.housing} onChange={(value) => updateEconomy("housing", value)} placeholder="Type" />
                        <SheetInput label="Rent" value={sheet.economy.rent} onChange={(value) => updateEconomy("rent", value)} placeholder="0" />
                        <SheetInput label="Lifestyle" value={sheet.economy.lifestyle} onChange={(value) => updateEconomy("lifestyle", value)} placeholder="Type" />
                        <SheetInput label="Cost" value={sheet.economy.cost} onChange={(value) => updateEconomy("cost", value)} placeholder="0" />
                      </div>
                    </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="min-w-0 space-y-5">
            <CollapsibleSection
              title="INVENTORY"
              subtitle="Quick access"
              open={showInventory}
              onToggle={() => setShowInventory((current) => !current)}
            >
              {inventoryEditable ? (
                <div className="mb-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr_auto] sm:items-end">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Source
                      </span>
                      <select
                        value={inventorySource}
                        onChange={(event) => {
                          const nextSource = event.target.value as "Cyberware" | "Weapons";
                          setInventorySource(nextSource);
                          setSelectedInventoryItem("");
                        }}
                        className="h-10 w-full rounded-md border border-slate-900 bg-white px-3 text-sm outline-none focus:border-blue-700"
                      >
                        <option value="Cyberware">Cyberware</option>
                        <option value="Weapons">Weapons</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Item
                      </span>
                      <select
                        value={selectedInventoryItem}
                        onChange={(event) => setSelectedInventoryItem(event.target.value)}
                        className="h-10 w-full rounded-md border border-slate-900 bg-white px-3 text-sm outline-none focus:border-blue-700"
                      >
                        <option value="">Select an item...</option>
                        {inventoryOptions.map((itemOption) => (
                          <option key={`${itemOption.source}-${itemOption.name}`} value={itemOption.name}>
                            {itemOption.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={addSelectedItemToInventory}
                      disabled={!selectedInventoryItem}
                      className="h-10 rounded-md border border-blue-900 bg-blue-50 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Add to Inventory
                    </button>
                  </div>

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomInventoryModal(true)}
                      className="h-9 rounded-md border border-slate-900 bg-white px-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-800 hover:bg-slate-100"
                    >
                      Add Custom Item
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Inventory items
                </p>
                {inventoryItems.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-800">
                    {inventoryItems.map((item, index) => (
                      <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveInventoryItem(item)}
                          className="text-left underline decoration-dotted underline-offset-2 hover:text-blue-900"
                        >
                          {item.name}
                        </button>
                        {canEdit ? (
                          <div className="flex items-center gap-1">
                            {item.source === "Weapons" || item.source === "Cyberware" ? (
                              <button
                                type="button"
                                onClick={() => equipInventoryItem(item)}
                                className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-800 hover:bg-blue-100"
                              >
                                {isInventoryItemEquipped(item) ? "Unequip" : "Equip"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => removeInventoryItem(index)}
                              className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                                pendingInventoryRemovalIndex === index
                                  ? "border-red-700 bg-red-50 text-red-800 hover:bg-red-100"
                                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {pendingInventoryRemovalIndex === index ? "Confirm Remove" : "Remove"}
                            </button>
                            {pendingInventoryRemovalIndex === index ? (
                              <button
                                type="button"
                                onClick={() => setPendingInventoryRemovalIndex(null)}
                                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No inventory items listed.</p>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="SKILLS"
              subtitle="Single-line view"
              open={showSkills}
              onToggle={() => setShowSkills((current) => !current)}
            >
              <div className="space-y-5">
                {SKILL_SECTIONS.map((section) => (
                  <SkillSectionTable
                    key={section.title}
                    title={section.title}
                    items={section.items}
                    values={sheet.skills}
                    onChange={updateSkill}
                    onSkillClick={setActiveSkillLabel}
                  />
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="REP / CURRENT IP"
              subtitle="Campaign track"
              open={showCampaignTrack}
              onToggle={() => setShowCampaignTrack((current) => !current)}
            >
              <div className="space-y-3">
                <SheetInput
                  label="Rep"
                  value={sheet.rep}
                  onChange={(value) => {
                    if (!canEdit) {
                      return;
                    }

                    setSheet((current) => ({ ...current, rep: value }));
                  }}
                  placeholder="0"
                />
                <SheetInput
                  label="Current IP"
                  value={sheet.currentIp}
                  onChange={(value) => {
                    if (!canEdit) {
                      return;
                    }

                    setSheet((current) => ({ ...current, currentIp: value }));
                  }}
                  placeholder="0"
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="NOTES"
              subtitle="Character description"
              open={showNotes}
              onToggle={() => setShowNotes((current) => !current)}
            >
              <SheetTextarea
                label="Notes / goals"
                value={sheet.description}
                onChange={(value) => {
                  if (!canEdit) {
                    return;
                  }

                  setSheet((current) => ({ ...current, description: value }));
                }}
                rows={8}
                placeholder="Goals, bonds, or campaign notes"
              />
            </CollapsibleSection>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-blue-800">{success}</p> : null}
        {!canEdit ? <p className="text-sm text-slate-600">Read-only view. Sign in as Admin to edit this sheet.</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          {canEdit ? (
            <>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : submitLabel}
              </button>
              <p className="text-sm text-[var(--muted)]">Changes save to the member profile API.</p>
            </>
          ) : null}
        </div>
      </form>

      {isMounted && activeSkillLabel
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/55 p-4"
              onClick={() => setActiveSkillLabel(null)}
            >
              <div
                className="w-full max-w-xl rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">{activeSkillLabel}</p>
                  <button
                    type="button"
                    onClick={() => setActiveSkillLabel(null)}
                    className="rounded-md border border-slate-900 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
                <p className="max-h-[70vh] overflow-y-auto text-sm leading-6 text-slate-800">{activeSkillDescription}</p>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isMounted && activeInventoryItem
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/55 p-4"
              onClick={() => setActiveInventoryItem(null)}
            >
              <div
                className="w-full max-w-xl rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
                    {activeInventoryItem.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveInventoryItem(null)}
                    className="rounded-md border border-slate-900 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2 text-sm leading-6 text-slate-800">
                  <p>
                    <span className="font-semibold">Source:</span> {activeInventoryItem.source}
                  </p>
                  <p>
                    <span className="font-semibold">Description:</span>{" "}
                    {activeInventoryItem.description.trim().length > 0
                      ? activeInventoryItem.description
                      : "No additional description."}
                  </p>
                  {canEdit && (activeInventoryItem.source === "Weapons" || activeInventoryItem.source === "Cyberware") ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => equipInventoryItem(activeInventoryItem)}
                        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-blue-800 hover:bg-blue-100"
                      >
                        {isInventoryItemEquipped(activeInventoryItem) ? "Unequip from Sheet" : "Equip to Sheet"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isMounted && showCustomInventoryModal
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/55 p-4"
              onClick={() => setShowCustomInventoryModal(false)}
            >
              <div
                className="w-full max-w-xl rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
                    Add Custom Inventory Item
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCustomInventoryModal(false)}
                    className="rounded-md border border-slate-900 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3">
                  <SheetInput
                    label="Item name"
                    value={customInventoryName}
                    onChange={setCustomInventoryName}
                    placeholder="Example: Concealed Med Injector"
                  />
                  <SheetTextarea
                    label="Description"
                    value={customInventoryDescription}
                    onChange={setCustomInventoryDescription}
                    rows={5}
                    placeholder="Add all details you want shown when clicked"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addCustomInventoryItem}
                      disabled={customInventoryName.trim().length === 0}
                      className="rounded-md border border-blue-900 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save Item
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
