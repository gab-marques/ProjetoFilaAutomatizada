import { describe, it, expect } from 'vitest';
import {
  getTableCategory,
  calculateQueuePosition,
  estimateBaselineWait,
  areCompatibleParties,
  QueueItem,
} from '@/lib/queue/position';

describe('Queue Position & Table Logic (lib/queue/position.ts)', () => {
  it('should categorize party sizes into table capacities correctly', () => {
    expect(getTableCategory(1)).toBe('2');
    expect(getTableCategory(2)).toBe('2');
    expect(getTableCategory(3)).toBe('4');
    expect(getTableCategory(4)).toBe('4');
    expect(getTableCategory(5)).toBe('6');
    expect(getTableCategory(8)).toBe('6');
  });

  it('should correctly determine if two parties are compatible', () => {
    expect(areCompatibleParties(1, 2)).toBe(true);
    expect(areCompatibleParties(3, 4)).toBe(true);
    expect(areCompatibleParties(2, 4)).toBe(false);
    expect(areCompatibleParties(4, 6)).toBe(false);
  });

  it('should assign position 1 and 0 groups ahead to the first entry', () => {
    const queue: QueueItem[] = [
      { id: '1', party_size: 2, status: 'waiting', joined_at: '2026-11-12T12:00:00Z' },
    ];
    const res = calculateQueuePosition(queue, '1');
    expect(res.position).toBe(1);
    expect(res.groupsAhead).toBe(0);
    expect(res.totalInQueue).toBe(1);
  });

  it('should calculate sequential positions for identical table sizes', () => {
    const queue: QueueItem[] = [
      { id: '1', party_size: 2, status: 'waiting', joined_at: '2026-11-12T12:00:00Z' },
      { id: '2', party_size: 2, status: 'waiting', joined_at: '2026-11-12T12:05:00Z' },
      { id: '3', party_size: 1, status: 'waiting', joined_at: '2026-11-12T12:10:00Z' },
    ];

    expect(calculateQueuePosition(queue, '1').position).toBe(1);
    expect(calculateQueuePosition(queue, '2').position).toBe(2);
    expect(calculateQueuePosition(queue, '3').position).toBe(3);
    expect(calculateQueuePosition(queue, '3').groupsAhead).toBe(2);
  });

  it('should NOT make different table capacities compete with each other', () => {
    const queue: QueueItem[] = [
      { id: '1', party_size: 2, status: 'waiting', joined_at: '2026-11-12T12:00:00Z' }, // cat 2
      { id: '2', party_size: 4, status: 'waiting', joined_at: '2026-11-12T12:02:00Z' }, // cat 4
      { id: '3', party_size: 6, status: 'waiting', joined_at: '2026-11-12T12:04:00Z' }, // cat 6
      { id: '4', party_size: 2, status: 'waiting', joined_at: '2026-11-12T12:06:00Z' }, // cat 2
    ];

    // For table category '4', id '2' is the FIRST in line (position 1)
    const partyOf4 = calculateQueuePosition(queue, '2');
    expect(partyOf4.position).toBe(1);
    expect(partyOf4.groupsAhead).toBe(0);

    // For table category '2', id '4' is SECOND in line (position 2)
    const secondPartyOf2 = calculateQueuePosition(queue, '4');
    expect(secondPartyOf2.position).toBe(2);
    expect(secondPartyOf2.groupsAhead).toBe(1);
  });

  it('should ignore inactive entries (seated, cancelled, no_show)', () => {
    const queue: QueueItem[] = [
      { id: '1', party_size: 4, status: 'seated', joined_at: '2026-11-12T12:00:00Z' },
      { id: '2', party_size: 4, status: 'cancelled', joined_at: '2026-11-12T12:02:00Z' },
      { id: '3', party_size: 4, status: 'waiting', joined_at: '2026-11-12T12:05:00Z' },
    ];

    const res = calculateQueuePosition(queue, '3');
    expect(res.position).toBe(1);
    expect(res.groupsAhead).toBe(0);
    expect(res.totalInQueue).toBe(1);
  });

  it('should correctly estimate baseline wait time', () => {
    expect(estimateBaselineWait(0, 6, 40)).toBe(0);
    // 4 groups ahead with 2 tables -> ceil(4/2) = 2 cycles * 20 min = 40 min
    expect(estimateBaselineWait(4, 2, 40)).toBe(40);
  });

  it('should return position 0 when target entry is not found', () => {
    const queue: QueueItem[] = [
      { id: '1', party_size: 2, status: 'waiting', joined_at: '2026-11-12T12:00:00Z' },
    ];
    const res = calculateQueuePosition(queue, 'non-existent');
    expect(res.position).toBe(0);
    expect(res.groupsAhead).toBe(0);
  });
});
