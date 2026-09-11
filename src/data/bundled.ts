import { validateSet } from '@/core/validate';
import type { Repository } from './repository';
import cloudBasics from '../../assets/sets/sample-cloud-basics.json';
import allTypes from '../../assets/sets/sample-all-types.json';
import comptiaCore1 from '../../content/comptia-a-plus-core-1.json';

export const BUNDLED_SETS: unknown[] = [cloudBasics, allTypes, comptiaCore1];

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
