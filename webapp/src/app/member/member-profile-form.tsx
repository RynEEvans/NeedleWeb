"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
    hl: "0",
  };
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
        hl: "0",
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
      hl: String(
        cyberwareRows
          .filter((row) => row.type === typeRow.name)
          .reduce((total, row) => total + parseHl(row.hl), 0),
      ),
    }));

    return {
      ...nextSheet,
      cyberwareRows,
      cyberwareTypeRows,
    };
  };

  return withComputedCyberwareHl({
    ...fallback,
    ...sheet,
    stats: { ...fallback.stats, ...sheet.stats },
    combat: {
      ...fallback.combat,
      ...sheet.combat,
      body: {
        ...fallback.combat.body,
        ...sheet.combat.body,
      },
    },
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
    cyberwareRows: (sheet.cyberwareRows.length > 0 ? sheet.cyberwareRows : fallback.cyberwareRows).map(
      (row) => ({
        ...row,
        hl: normalizeHl(row.hl),
      }),
    ),
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
}: {
  title: string;
  items: readonly string[];
  values: Record<string, string>;
  onChange: (label: string, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-base font-semibold uppercase tracking-[0.14em] text-slate-950">
        {title}
      </h3>
      <div className="space-y-1.5">
        {items.map((label) => (
          <div key={label} className="flex items-center gap-2 text-[13px] leading-5 text-slate-900">
            <span className="shrink-0">{label}</span>
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
      <div className="mb-3 flex items-start justify-between gap-3">
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
  const [activeCyberwareNoteText, setActiveCyberwareNoteText] = useState<string | null>(null);
  const [pendingCyberwareHlChoice, setPendingCyberwareHlChoice] = useState<Record<number, boolean>>({});
  const [showSkills, setShowSkills] = useState(false);
  const [showCampaignTrack, setShowCampaignTrack] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showLoadoutSections, setShowLoadoutSections] = useState({
    weapons: true,
    cyberwareType: true,
    cyberwareName: true,
    armor: true,
    gear: true,
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
  const canOverrideReadOnly = canEdit && canEditReadOnlyFields;

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
        hl: "0",
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

  const NOTE_PREVIEW_LENGTH = 72;
  const shouldShowReadMore = (notes: string) => notes.trim().length > NOTE_PREVIEW_LENGTH;
  const canOpenMoreModal = (notes: string) => notes.trim().length > 0;
  const getNotesPreview = (notes: string) => {
    if (!shouldShowReadMore(notes)) {
      return notes;
    }

    return `${notes.slice(0, NOTE_PREVIEW_LENGTH).trimEnd()}...`;
  };

  const getHlTextSizeClass = (hl: string) => (hl.trim().length > 8 ? "text-xs" : "text-sm");

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

    return {
      ...nextSheet,
      cyberwareRows,
      cyberwareTypeRows: nextSheet.cyberwareTypeRows.map((typeRow) => ({
        ...typeRow,
        optionSlots: String(getAvailableOptionSlotsForType(typeRow.name, installedCyberware)),
        hl: String(
          cyberwareRows
            .filter((row) => row.type === typeRow.name)
            .reduce((total, row) => total + parseHl(row.hl), 0),
        ),
      })),
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
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      weaponRows: current.weaponRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
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
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      weaponRows: [...current.weaponRows, createEmptyWeaponRow()],
    }));
  }

  function removeWeaponRow() {
    if (!canEdit) {
      return;
    }

    setSheet((current) => {
      if (current.weaponRows.length <= 1) {
        return current;
      }

      return {
        ...current,
        weaponRows: current.weaponRows.slice(0, -1),
      };
    });
  }

  function addArmorRow() {
    if (!canEdit) {
      return;
    }

    setSheet((current) => ({
      ...current,
      armorRows: [...current.armorRows, createEmptyArmorRow()],
    }));
  }

  function removeArmorRow() {
    if (!canEdit) {
      return;
    }

    setSheet((current) => {
      if (current.armorRows.length <= 1) {
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
    if (!canEdit) {
      return;
    }

    if (field === "name") {
      setActiveCyberwareNoteText(null);
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
    if (!canEdit) {
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
    if (!canEdit) {
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
    if (!canEdit) {
      return;
    }

    setActiveCyberwareNoteText(null);
    setPendingCyberwareHlChoice({});

    setSheet((current) => {
      if (current.cyberwareRows.length <= 1) {
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

  function parseFoundationSelections(value: string): Set<string> {
    return new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    );
  }

  function serializeFoundationSelections(selections: Set<string>): string {
    return Array.from(selections.values()).sort().join(",");
  }

  function updateFoundationSelection(
    rowIndex: number,
    foundationKey: string,
    checked: boolean,
    currentFoundationValue: string,
  ) {
    if (!canEdit) {
      return;
    }

    const selections = parseFoundationSelections(currentFoundationValue);
    if (checked) {
      selections.add(foundationKey);
    } else {
      selections.delete(foundationKey);
    }

    updateCyberwareTypeRow(rowIndex, "foundation", serializeFoundationSelections(selections));
  }

  function updateHumanityTrack(
    field: keyof CharacterSheet["humanityTrack"],
    value: string,
  ) {
    if (!canEdit) {
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
    <section className="w-full rounded-[2rem] border-4 border-slate-950 bg-[#f5f5f5] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
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
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 overflow-x-hidden">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
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
                  <SheetInput
                    label="BTM"
                    value={sheet.combat.btm}
                    onChange={(value) => updateCombat("btm", value)}
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
                <SectionHeader title="SAVE / BTM" subtitle="Combat track" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Save
                    </div>
                    <input
                      type="text"
                      value={sheet.combat.save}
                      onChange={(event) => updateCombat("save", event.target.value)}
                      className="mt-1 w-full border-0 bg-transparent p-0 text-sm outline-none"
                    />
                  </div>
                  <div className="rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      BTM
                    </div>
                    <input
                      type="text"
                      value={sheet.combat.btm}
                      onChange={(event) => updateCombat("btm", event.target.value)}
                      className="mt-1 w-full border-0 bg-transparent p-0 text-sm outline-none"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Use this block for damage, save, and armor notes.
                </p>
              </div>
            </section>

            <section className="rounded-[1.15rem] border-2 border-slate-900 bg-white p-4">
              <PanelHeader title="WEAPONS, ARMOR, CYBERWARE & GEAR" subtitle="Reference-style panels" />
              <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
                <div className="space-y-4">
                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Weapons
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                          onClick={() => toggleLoadoutSection("weapons")}
                        >
                          {showLoadoutSections.weapons ? "Hide" : "Show"}
                        </button>
                        {canEdit && showLoadoutSections.weapons ? (
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
                              disabled={sheet.weaponRows.length <= 1}
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
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.name} onChange={(event) => updateWeaponRow(index, "name", event.target.value)} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              DMG
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.dmg} onChange={(event) => updateWeaponRow(index, "dmg", event.target.value)} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              ROF
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.rof} onChange={(event) => updateWeaponRow(index, "rof", event.target.value)} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Hands
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.hands} onChange={(event) => updateWeaponRow(index, "hands", event.target.value)} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Con
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.con} onChange={(event) => updateWeaponRow(index, "con", event.target.value)} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Mag
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.mag} onChange={(event) => updateWeaponRow(index, "mag", event.target.value)} />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Ammo
                              <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.ammo} onChange={(event) => updateWeaponRow(index, "ammo", event.target.value)} />
                            </label>
                          </div>
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            Notes
                            <input className="mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm" value={row.notes} onChange={(event) => updateWeaponRow(index, "notes", event.target.value)} />
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="hidden w-full space-y-2 overflow-x-auto md:block">
                      <div className="grid w-full grid-cols-[minmax(8rem,2.2fr)_minmax(2.5rem,0.7fr)_minmax(2.2rem,0.55fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(7rem,1.4fr)] gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        <span>Weapon Name</span>
                        <span>DMG</span>
                        <span>ROF</span>
                        <span>Hands</span>
                        <span>Con</span>
                        <span>Mag</span>
                        <span>Ammo</span>
                        <span>Notes</span>
                      </div>
                      {sheet.weaponRows.map((row, index) => (
                        <div key={index} className="grid w-full grid-cols-[minmax(8rem,2.2fr)_minmax(2.5rem,0.7fr)_minmax(2.2rem,0.55fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(2.5rem,0.7fr)_minmax(7rem,1.4fr)] gap-2">
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.name} onChange={(event) => updateWeaponRow(index, "name", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.dmg} onChange={(event) => updateWeaponRow(index, "dmg", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.rof} onChange={(event) => updateWeaponRow(index, "rof", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.hands} onChange={(event) => updateWeaponRow(index, "hands", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.con} onChange={(event) => updateWeaponRow(index, "con", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.mag} onChange={(event) => updateWeaponRow(index, "mag", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.ammo} onChange={(event) => updateWeaponRow(index, "ammo", event.target.value)} />
                          <input className="min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm" value={row.notes} onChange={(event) => updateWeaponRow(index, "notes", event.target.value)} />
                        </div>
                      ))}
                    </div>
                    </>
                    ) : null}
                  </div>

                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
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
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.6fr] gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        <span>Type</span>
                        <span>Option Slots</span>
                        <span>Foundation</span>
                        <span>HL</span>
                      </div>
                      {sheet.cyberwareTypeRows.map((row, index) => (
                        <div key={index} className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.6fr] gap-2">
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
                            <div className="min-h-9 rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                              <div className="flex items-center justify-between gap-2">
                                <span>Arms</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("A1")}
                                    onChange={(event) =>
                                      updateFoundationSelection(index, "A1", event.target.checked, row.foundation)
                                    }
                                    className="h-3.5 w-3.5 accent-blue-800"
                                  />
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("A2")}
                                    onChange={(event) =>
                                      updateFoundationSelection(index, "A2", event.target.checked, row.foundation)
                                    }
                                    className="h-3.5 w-3.5 accent-blue-800"
                                  />
                                </div>
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <span>Legs</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("L1")}
                                    onChange={(event) =>
                                      updateFoundationSelection(index, "L1", event.target.checked, row.foundation)
                                    }
                                    className="h-3.5 w-3.5 accent-blue-800"
                                  />
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("L2")}
                                    onChange={(event) =>
                                      updateFoundationSelection(index, "L2", event.target.checked, row.foundation)
                                    }
                                    className="h-3.5 w-3.5 accent-blue-800"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : row.name.trim().toLowerCase() === "cyberoptics" ? (
                            <div className="min-h-9 rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                              <div className="flex items-center justify-between gap-2">
                                <span>Eyes</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("E1")}
                                    onChange={(event) =>
                                      updateFoundationSelection(index, "E1", event.target.checked, row.foundation)
                                    }
                                    className="h-3.5 w-3.5 accent-blue-800"
                                  />
                                  <input
                                    type="checkbox"
                                    checked={parseFoundationSelections(row.foundation).has("E2")}
                                    onChange={(event) =>
                                      updateFoundationSelection(index, "E2", event.target.checked, row.foundation)
                                    }
                                    className="h-3.5 w-3.5 accent-blue-800"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className="flex min-h-9 items-center justify-center rounded-md border border-slate-900 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                              <input
                                type="checkbox"
                                checked={["true", "yes", "1", "checked", "x"].includes(row.foundation.trim().toLowerCase())}
                                onChange={(event) => updateCyberwareTypeRow(index, "foundation", event.target.checked ? "Yes" : "")}
                                className="h-4 w-4 accent-blue-800"
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
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Cyberware Name
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                          onClick={() => toggleLoadoutSection("cyberwareName")}
                        >
                          {showLoadoutSections.cyberwareName ? "Hide" : "Show"}
                        </button>
                        {canEdit && showLoadoutSections.cyberwareName ? (
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
                              disabled={sheet.cyberwareRows.length <= 1}
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
                                Notes
                              </span>
                              {matchedCyberwareEntry ? (
                                <div className="mt-1 flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-slate-900 bg-slate-50 px-3 py-2 text-sm">
                                  <p className="min-w-0 flex-1 truncate">{getNotesPreview(row.notes)}</p>
                                  {canOpenMoreModal(row.notes) ? (
                                    <button
                                      type="button"
                                      className="shrink-0 text-[11px] font-semibold text-blue-800 hover:text-blue-700"
                                      onClick={() => setActiveCyberwareNoteText(row.notes)}
                                    >
                                      More
                                    </button>
                                  ) : null}
                                </div>
                              ) : (
                                <input
                                  className={`mt-1 h-10 w-full min-w-0 rounded-md border border-slate-900 px-3 py-2 text-sm ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                                  value={row.notes}
                                  onChange={(event) => updateCyberwareRow(index, "notes", event.target.value)}
                                  readOnly={!canOverrideReadOnly}
                                  aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                                  tabIndex={canOverrideReadOnly ? 0 : -1}
                                />
                              )}
                            </div>
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
                      <div className="grid w-full grid-cols-[minmax(9rem,1.9fr)_minmax(5.5rem,1.1fr)_minmax(10rem,2fr)_minmax(3.25rem,0.55fr)] gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        <span>Cyberware Name</span>
                        <span>Type</span>
                        <span>Notes</span>
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
                        <div key={index} className="grid w-full grid-cols-[minmax(9rem,1.9fr)_minmax(5.5rem,1.1fr)_minmax(10rem,2fr)_minmax(3.25rem,0.55fr)] items-center gap-2">
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
                          {matchedCyberwareEntry ? (
                            <div className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-slate-900 bg-slate-50 px-2 py-1 text-sm">
                              <p className="min-w-0 flex-1 truncate">
                                {getNotesPreview(row.notes)}
                              </p>
                              {canOpenMoreModal(row.notes) ? (
                                <button
                                  type="button"
                                    className="shrink-0 text-[11px] font-semibold text-blue-800 hover:text-blue-700"
                                  onClick={() => setActiveCyberwareNoteText(row.notes)}
                                >
                                  More
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <input
                              className={`h-9 min-w-0 rounded-md border border-slate-900 px-2 py-1 text-sm ${canOverrideReadOnly ? "bg-white" : "bg-slate-50"}`}
                              value={row.notes}
                              onChange={(event) => updateCyberwareRow(index, "notes", event.target.value)}
                              readOnly={!canOverrideReadOnly}
                              aria-readonly={!canOverrideReadOnly ? "true" : "false"}
                              tabIndex={canOverrideReadOnly ? 0 : -1}
                            />
                          )}
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
                            <div className="col-span-4 mt-1 rounded-md border border-amber-500/60 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
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

                <div className="space-y-4">
                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Armor
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                          onClick={() => toggleLoadoutSection("armor")}
                        >
                          {showLoadoutSections.armor ? "Hide" : "Show"}
                        </button>
                        {canEdit && showLoadoutSections.armor ? (
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
                              disabled={sheet.armorRows.length <= 1}
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
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">
                        Gear
                      </h3>
                      <button
                        type="button"
                        className="rounded-md border border-slate-900 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100"
                        onClick={() => toggleLoadoutSection("gear")}
                      >
                        {showLoadoutSections.gear ? "Hide" : "Show"}
                      </button>
                    </div>
                    {showLoadoutSections.gear ? (
                    <textarea
                      value={sheet.gear}
                      onChange={(event) => {
                        if (!canEdit) {
                          return;
                        }

                        setSheet((current) => ({ ...current, gear: event.target.value }));
                      }}
                      rows={16}
                      className="min-h-[20rem] w-full rounded-md border border-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-700"
                      placeholder="Gear and carried items"
                    />
                    ) : null}
                  </div>

                  <div className="rounded-[1rem] border border-slate-900 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
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
                      <div className="grid grid-cols-4 gap-2">
                        <SheetInput label="Current" value={sheet.humanityTrack.current} onChange={(value) => updateHumanityTrack("current", value)} placeholder="0" />
                        <SheetInput label="Decreased" value={sheet.humanityTrack.decreased} onChange={(value) => updateHumanityTrack("decreased", value)} placeholder="0" />
                        <SheetInput label="Max" value={sheet.humanityTrack.max} onChange={(value) => updateHumanityTrack("max", value)} placeholder="0" />
                        <SheetInput label="Total HL" value={sheet.humanityTrack.totalHl} onChange={(value) => updateHumanityTrack("totalHl", value)} placeholder="0" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
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

          <div className="space-y-5">
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

      {activeCyberwareNoteText ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">Cyberware Notes</p>
              <button
                type="button"
                onClick={() => setActiveCyberwareNoteText(null)}
                className="rounded-md border border-slate-900 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <p className="max-h-[50vh] overflow-y-auto text-sm leading-6 text-slate-800">{activeCyberwareNoteText}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
