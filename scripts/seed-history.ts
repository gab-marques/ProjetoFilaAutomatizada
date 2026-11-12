import seedrandom from 'seedrandom';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../lib/supabase/server';
import config from '../config/simulation.json';

// Poisson random variable generator using Knuth's algorithm
function poissonRandom(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

export interface SyntheticWaitEntry {
  id: string;
  restaurant_id: string;
  party_size: number;
  dow: number;
  hour: number;
  queue_len_at_join: number;
  tables_free_at_join: number;
  actual_wait_min: number;
  outcome: 'seated' | 'no_show' | 'cancelled';
  is_synthetic: boolean;
  created_at: string;
}

export function generateSyntheticHistory(
  restaurantId = '11111111-1111-1111-1111-111111111111',
  weeks = 6,
): SyntheticWaitEntry[] {
  const rng = seedrandom(config.seed);
  const entries: SyntheticWaitEntry[] = [];

  const startDate = new Date('2026-09-01T10:00:00Z');
  const totalDays = weeks * 7;

  for (let d = 0; d < totalDays; d++) {
    const currentDate = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
    const dow = currentDate.getDay();
    const dowMultiplier = (config.dow_arrival_multiplier as Record<string, number>)[dow.toString()] || 1.0;

    // Reset queue daily at opening (11:00)
    let simulatedQueueLen = 0;

    for (let hour = 11; hour <= 23; hour++) {
      const hourMultiplier =
        (config.hourly_arrival_multiplier as Record<string, number>)[hour.toString()] || 0.1;

      // Peak hour arrivals vs non-peak
      const expectedArrivals = 3.5 * dowMultiplier * hourMultiplier;
      const actualArrivals = poissonRandom(expectedArrivals, rng);

      // Tables turnover: groups served and leaving each hour (approx 3-6 tables turnover/hr)
      const servedThisHour = Math.floor(rng() * 4 + 3);
      simulatedQueueLen = Math.max(0, simulatedQueueLen - servedThisHour);

      const tablesFree = Math.max(0, 8 - simulatedQueueLen);

      for (let i = 0; i < actualArrivals; i++) {
        // Pick party size
        const pRoll = rng();
        let cumulative = 0;
        let partySize = 2;
        for (const dist of config.party_size_distribution) {
          cumulative += dist.weight;
          if (pRoll <= cumulative) {
            partySize = dist.size;
            break;
          }
        }

        const cat = partySize <= 2 ? '2' : partySize <= 4 ? '4' : '6';
        const baseTurnover = (config.base_turnover_minutes as Record<string, number>)[cat] || 40;

        // Weekend effect: tables turn over 15% slower on Fri (5), Sat (6), Sun (0)
        const isWeekend = dow === 5 || dow === 6 || dow === 0;
        const weekendPenalty = isWeekend ? 1.15 : 1.0;

        // Realistic actual wait calculation:
        // When queue is empty: 5 - 12 min
        // When queue has groups ahead: ~3-5 min per group ahead + base + noise
        const noise = (rng() - 0.5) * 6;
        const perGroupWait = cat === '6' ? 4.5 : cat === '4' ? 3.0 : 2.0;
        const actualWaitMin = Math.max(
          5,
          Math.min(
            90,
            Math.round(
              simulatedQueueLen * perGroupWait * weekendPenalty +
                (tablesFree === 0 ? baseTurnover * 0.35 : 5) +
                noise,
            ),
          ),
        );

        // Outcome roll
        const outcomeRoll = rng();
        let outcome: 'seated' | 'no_show' | 'cancelled' = 'seated';
        // Desistências aumentam se a espera for longa
        const cancelThreshold = actualWaitMin > 45 ? 0.18 : 0.05;
        if (outcomeRoll < cancelThreshold) {
          outcome = 'cancelled';
        } else if (outcomeRoll < cancelThreshold + config.no_show_rate) {
          outcome = 'no_show';
        }

        const entryDate = new Date(currentDate.getTime() + hour * 3600 * 1000 + i * 180 * 1000);

        entries.push({
          id: crypto.randomUUID(),
          restaurant_id: restaurantId,
          party_size: partySize,
          dow,
          hour,
          queue_len_at_join: simulatedQueueLen,
          tables_free_at_join: tablesFree,
          actual_wait_min: actualWaitMin,
          outcome,
          is_synthetic: true,
          created_at: entryDate.toISOString(),
        });

        if (outcome === 'seated') {
          simulatedQueueLen += 1;
        }
      }
    }
  }

  return entries;
}

async function runSeed() {
  console.log('Generating realistic synthetic wait history (~6 weeks)...');
  const entries = generateSyntheticHistory();
  console.log(`Generated ${entries.length} realistic synthetic entries.`);

  const dataDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'synthetic_history.json'),
    JSON.stringify(entries, null, 2),
    'utf-8',
  );
  console.log(`Saved locally to data/synthetic_history.json`);

  try {
    const isMock = !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('mock');
    if (!isMock) {
      for (let i = 0; i < entries.length; i += 200) {
        const chunk = entries.slice(i, i + 200);
        await supabaseAdmin.from('wait_history').insert(chunk);
      }
      console.log(`Inserted ${entries.length} entries into Supabase wait_history.`);
    }
  } catch {
    console.log('Supabase offline or mock; local synthetic dataset ready.');
  }
}

if (require.main === module) {
  runSeed().catch(console.error);
}
