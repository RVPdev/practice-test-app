import { validateSet } from '@/core/validate';
import type { Repository, SetSummary } from './repository';
import cloudBasics from '../../assets/sets/sample-cloud-basics.json';
import allTypes from '../../assets/sets/sample-all-types.json';
import comptiaCore1 from '../../content/comptia-a-plus-core-1.json';
import comptiaCore2 from '../../content/comptia-a-plus-core-2.json';
import comptiaCore2Vol2 from '../../content/comptia-a-plus-core-2-220-1202-vol2.json';
import comptiaSecurityPlus from '../../content/comptia-security-plus-sy0-701.json';
import comptiaSecurityPlusVol2 from '../../content/comptia-security-plus-sy0-701-vol2.json';
import quickCore2 from '../../content/quick-comptia-a-plus-core-2.json';
import quickSecurityPlus from '../../content/quick-comptia-security-plus.json';
import quickNetworkPlus from '../../content/quick-comptia-network-plus.json';

export const BUNDLED_SETS: unknown[] = [
  cloudBasics,
  allTypes,
  comptiaCore1,
  comptiaCore2,
  comptiaCore2Vol2,
  comptiaSecurityPlus,
  comptiaSecurityPlusVol2,
  quickCore2,
  quickSecurityPlus,
  quickNetworkPlus,
];

export type BundledFamily = { id: string; label: string; setIds: string[] };

/**
 * Display grouping for the library screen. Code-only, never part of the
 * portable `.json` set schema. This is the one place to extend when a new
 * bundled exam ships, alongside its `BUNDLED_SETS` registration above.
 */
export const BUNDLED_FAMILIES: BundledFamily[] = [
  { id: 'a-plus-core-1', label: 'A+ Core 1', setIds: ['comptia-a-plus-core-1-220-1201'] },
  {
    id: 'a-plus-core-2',
    label: 'A+ Core 2',
    setIds: [
      'comptia-a-plus-core-2-220-1202',
      'comptia-a-plus-core-2-220-1202-vol2',
      'quick-comptia-a-plus-core-2-220-1202',
    ],
  },
  {
    id: 'security-plus',
    label: 'Security+',
    setIds: [
      'comptia-security-plus-sy0-701',
      'comptia-security-plus-sy0-701-vol2',
      'quick-comptia-security-plus-sy0-701',
    ],
  },
  { id: 'network-plus', label: 'Network+', setIds: ['quick-comptia-network-plus-n10-009'] },
  { id: 'samples', label: 'Samples', setIds: ['sample-cloud-basics', 'sample-all-types'] },
];

/**
 * Imported/created sets always land in "My sets". A bundled id with no
 * matching family entry falls back to its own title, so new content never
 * silently vanishes from the library while BUNDLED_FAMILIES is caught up.
 */
export function familyForSet(summary: Pick<SetSummary, 'id' | 'title' | 'source'>): string {
  if (summary.source === 'imported') return 'My sets';
  const match = BUNDLED_FAMILIES.find((family) => family.setIds.includes(summary.id));
  return match ? match.label : summary.title;
}

/**
 * Groups sets for the library screen: known families first (in
 * BUNDLED_FAMILIES order, each family's own sets ordered by its `setIds`
 * list), then any bundled set without a family entry under its own title,
 * then "My sets" last. A family with none of its sets present is omitted.
 */
export function groupSetsByFamily(sets: SetSummary[]): { family: string; sets: SetSummary[] }[] {
  const orderedLabels = BUNDLED_FAMILIES.map((family) => family.label);
  const byFamily = new Map<string, SetSummary[]>();

  for (const set of sets) {
    const family = familyForSet(set);
    if (family !== 'My sets' && !orderedLabels.includes(family)) orderedLabels.push(family);
    const bucket = byFamily.get(family) ?? [];
    bucket.push(set);
    byFamily.set(family, bucket);
  }
  orderedLabels.push('My sets');

  return orderedLabels
    .filter((family) => byFamily.has(family))
    .map((family) => {
      const catalogEntry = BUNDLED_FAMILIES.find((f) => f.label === family);
      const members = byFamily.get(family)!;
      if (!catalogEntry) return { family, sets: members };
      const order = catalogEntry.setIds;
      return { family, sets: [...members].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)) };
    });
}

/**
 * Writes every bundled set into the repository. Re-running replaces the set
 * content in place, so attempt history survives an app update that ships new
 * sample content.
 */
export async function seedBundledSets(repo: Repository): Promise<void> {
  for (const raw of BUNDLED_SETS) {
    const result = validateSet(raw);
    if (!result.ok) {
      // A malformed bundled set is a build-time bug; fail loudly in development.
      throw new Error(`Bundled set is invalid: ${JSON.stringify(result.errors)}`);
    }
    await repo.saveSet(result.set, 'bundled', 'replace');
  }
}
