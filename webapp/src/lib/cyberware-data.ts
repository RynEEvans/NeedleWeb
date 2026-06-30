import cyberwareCatalog from "./cyberware-data.json";
import cyberwareTypeMaximums from "./cyberware-type-maximums.json";

export type CyberwareCatalogEntry = {
  name: string;
  type: string;
  install: string;
  descriptionData: string;
  cost: string;
  optionSlots: string;
  hl: string;
};

export type CyberwarePrerequisiteContext = {
  installedCyberwareNames: string[];
  bodyStat?: number;
};

export type InstalledCyberwareReference = {
  name: string;
  type: string;
};

type CyberwareTypeMaximum = {
  type: string;
  maxOptionSlots: number | null;
};

export const CYBERWARE_CATALOG = cyberwareCatalog as CyberwareCatalogEntry[];

const CYBERWARE_CATALOG_BY_NAME = new Map(
  CYBERWARE_CATALOG.map((entry) => [entry.name.trim().toLowerCase(), entry]),
);

const CYBERWARE_TYPE_MAXIMUMS = cyberwareTypeMaximums as CyberwareTypeMaximum[];
const CYBERWARE_TYPE_MAXIMUMS_BY_TYPE = new Map(
  CYBERWARE_TYPE_MAXIMUMS.map((entry) => [entry.type.trim().toLowerCase(), entry]),
);

export function findCyberwareCatalogEntry(name: string): CyberwareCatalogEntry | undefined {
  return CYBERWARE_CATALOG_BY_NAME.get(name.trim().toLowerCase());
}

function countInstalledCyberware(names: string[]) {
  const counts = new Map<string, number>();
  for (const rawName of names) {
    const normalizedName = rawName.trim().toLowerCase();
    if (!normalizedName) {
      continue;
    }

    counts.set(normalizedName, (counts.get(normalizedName) ?? 0) + 1);
  }

  return counts;
}

function getInstalledCount(counts: Map<string, number>, name: string) {
  return counts.get(name.trim().toLowerCase()) ?? 0;
}

function parseOptionSlots(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFoundationCyberware(entry: CyberwareCatalogEntry): boolean {
  return /Has\s+\d+\s+Option\s+Slots?/i.test(entry.descriptionData);
}

function getOptionSlotConsumerType(entry: CyberwareCatalogEntry): string {
  const description = entry.descriptionData;

  if (/Requires\s+(?:a\s+)?Cyberaudio Suite/i.test(description)) {
    return "Cyberaudio";
  }

  if (/Requires\s+(?:a\s+)?Cybereye|Requires\s+two\s+Cybereyes/i.test(description)) {
    return "Cyberoptics";
  }

  if (/Requires\s+(?:a\s+)?Cyberarm(?:\s+or\s+Cyberleg)?|Requires\s+two\s+Cyberlegs/i.test(description)) {
    return "Cyberlimbs";
  }

  return entry.type;
}

export function getAvailableOptionSlotsForType(
  typeName: string,
  installedCyberware: InstalledCyberwareReference[],
): number {
  const normalizedType = typeName.trim().toLowerCase();
  if (!normalizedType) {
    return 0;
  }

  const installedEntries = installedCyberware
    .map((item) => findCyberwareCatalogEntry(item.name))
    .filter((entry): entry is CyberwareCatalogEntry => Boolean(entry));

  const installedEntriesForType = installedEntries.filter(
    (entry) => entry.type.trim().toLowerCase() === normalizedType,
  );

  const typeHasFoundationCyberware = CYBERWARE_CATALOG.some(
    (entry) => entry.type.trim().toLowerCase() === normalizedType && isFoundationCyberware(entry),
  );

  const foundationCapacity = installedEntriesForType
    .filter((entry) => isFoundationCyberware(entry))
    .reduce((total, entry) => total + parseOptionSlots(entry.optionSlots), 0);

  const baseCapacity = typeHasFoundationCyberware
    ? foundationCapacity
    : (CYBERWARE_TYPE_MAXIMUMS_BY_TYPE.get(normalizedType)?.maxOptionSlots ?? 0);

  const usedSlots = installedEntries
    .filter((entry) => !isFoundationCyberware(entry) && getOptionSlotConsumerType(entry).trim().toLowerCase() === normalizedType)
    .reduce((total, entry) => total + parseOptionSlots(entry.optionSlots), 0);

  return Math.max(0, baseCapacity - usedSlots);
}

export function getCyberwarePrerequisiteWarnings(
  entry: CyberwareCatalogEntry,
  context: CyberwarePrerequisiteContext,
): string[] {
  const warnings: string[] = [];
  const installedCounts = countInstalledCyberware(context.installedCyberwareNames);
  const description = entry.descriptionData;

  const requireAtLeast = (name: string, count: number, label?: string) => {
    if (getInstalledCount(installedCounts, name) < count) {
      warnings.push(label ?? `Requires ${count > 1 ? `${count} ` : ""}${name}.`);
    }
  };

  if (entry.name.trim().toLowerCase() === "cyberaudio suite") {
    const installedSuites = getInstalledCount(installedCounts, "Cyberaudio Suite");
    if (installedSuites > 1) {
      warnings.push("Only 1 Cyberaudio Suite can be installed.");
    }
  }

  if (/Requires Neural Link/i.test(description)) {
    requireAtLeast("Neural Link", 1);
  }

  if (/Requires Chipware Socket/i.test(description)) {
    requireAtLeast("Chipware Socket", 1);
  }

  if (/Requires two Cybereyes/i.test(description)) {
    requireAtLeast("Cybereye", 2, "Requires 2 Cybereyes.");
  } else if (/Requires a Cybereye/i.test(description)) {
    requireAtLeast("Cybereye", 1);
  }

  if (/Requires a Cyberaudio Suite/i.test(description) || /Requires Cyberaudio Suite/i.test(description)) {
    requireAtLeast("Cyberaudio Suite", 1);
  }

  if (/Requires two Cyberlegs/i.test(description)) {
    requireAtLeast("Cyberleg", 2, "Requires 2 Cyberlegs.");
  }

  if (/Requires a Cyberarm or Cyberleg/i.test(description)) {
    const cyberarmCount = getInstalledCount(installedCounts, "Cyberarm");
    const cyberlegCount = getInstalledCount(installedCounts, "Cyberleg");
    if (cyberarmCount < 1 && cyberlegCount < 1) {
      warnings.push("Requires Cyberarm or Cyberleg.");
    }
  } else if (/Requires a Cyberarm/i.test(description)) {
    requireAtLeast("Cyberarm", 1);
  }

  const requiredBodyMatch = description.match(/Requires BODY\s*(\d+)/i);
  if (requiredBodyMatch) {
    const minimumBody = Number.parseInt(requiredBodyMatch[1], 10);
    const currentBody = context.bodyStat ?? Number.NaN;
    if (!Number.isFinite(currentBody) || currentBody < minimumBody) {
      warnings.push(`Requires BODY ${minimumBody}.`);
    }
  }

  const graftedCountMatch = description.match(/(\d+)\s+Grafted Muscles and Bone Lace/i);
  if (graftedCountMatch) {
    const minimumGraftedCount = Number.parseInt(graftedCountMatch[1], 10);
    requireAtLeast(
      "Grafted Muscle and Bone Lace",
      minimumGraftedCount,
      `Requires ${minimumGraftedCount} Grafted Muscle and Bone Lace installations.`,
    );
  } else if (/and Grafted Muscles and Bone Lace/i.test(description)) {
    requireAtLeast(
      "Grafted Muscle and Bone Lace",
      1,
      "Requires Grafted Muscle and Bone Lace.",
    );
  }

  return warnings;
}