export interface QueueItem {
  id: string;
  party_size: number;
  status: string;
  joined_at: string;
}

export type TableCategory = '2' | '4' | '6';

/**
 * Returns the primary table category suited for a given group size.
 * 1-2 people -> table for 2
 * 3-4 people -> table for 4
 * 5-6 people -> table for 6
 * 7+ people  -> largest table capacity (6+)
 */
export function getTableCategory(partySize: number): TableCategory {
  if (partySize <= 2) return '2';
  if (partySize <= 4) return '4';
  return '6';
}

/**
 * Checks if two group sizes compete for the same table category.
 */
export function areCompatibleParties(partyA: number, partyB: number): boolean {
  return getTableCategory(partyA) === getTableCategory(partyB);
}

const ACTIVE_STATUSES = new Set(['waiting', 'notified', 'on_the_way', 'postponed']);

/**
 * Calculates a customer's 1-based position in the queue, considering only
 * groups that compete for compatible table sizes and joined prior.
 */
export function calculateQueuePosition(
  entries: QueueItem[],
  targetEntryId: string,
): { position: number; groupsAhead: number; totalInQueue: number } {
  const targetEntry = entries.find((e) => e.id === targetEntryId);
  if (!targetEntry) {
    return { position: 0, groupsAhead: 0, totalInQueue: 0 };
  }

  const targetCategory = getTableCategory(targetEntry.party_size);
  const targetJoinedTime = new Date(targetEntry.joined_at).getTime();

  // Active entries competing for the same category
  const competingEntries = entries.filter((e) => {
    if (!ACTIVE_STATUSES.has(e.status)) return false;
    return getTableCategory(e.party_size) === targetCategory;
  });

  // Sort chronologically by joined_at
  const sorted = [...competingEntries].sort(
    (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  );

  const index = sorted.findIndex((e) => e.id === targetEntryId);
  const position = index >= 0 ? index + 1 : 0;
  const groupsAhead = Math.max(0, position - 1);

  return {
    position,
    groupsAhead,
    totalInQueue: competingEntries.length,
  };
}

/**
 * Estimates baseline wait time based on groups ahead and average turnover per table.
 * Formula: (groupsAhead / numberOfTablesForCategory) * averageTurnoverMin
 */
export function estimateBaselineWait(
  groupsAhead: number,
  tablesForCategory: number,
  averageTurnoverMin = 45,
): number {
  if (groupsAhead <= 0) return 0;
  const effectiveTables = Math.max(1, tablesForCategory);
  const cycles = Math.ceil(groupsAhead / effectiveTables);
  return Math.round(cycles * (averageTurnoverMin / 2));
}
