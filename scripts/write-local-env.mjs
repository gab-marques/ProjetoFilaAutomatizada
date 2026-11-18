import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, writeFileSync } from 'node:fs';

const envPath = '.env.local';
if (existsSync(envPath)) {
  throw new Error(`${envPath} already exists. Remove it manually before regenerating local credentials.`);
}

const output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
});
const values = new Map(
  output
    .split(/\r?\n/)
    .filter((line) => line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const unwrap = (value) => value?.replace(/^"(.*)"$/, '$1');
const apiUrl = unwrap(values.get('API_URL'));
const anonKey = unwrap(values.get('ANON_KEY'));
const serviceRoleKey = unwrap(values.get('SERVICE_ROLE_KEY'));

if (
  !apiUrl ||
  !anonKey ||
  !serviceRoleKey ||
  !/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiUrl)
) {
  throw new Error(
    `Could not find local Supabase URL and keys. API URL reported by CLI: ${apiUrl || '(empty)'}. Anon present: ${Boolean(anonKey)}; service key present: ${Boolean(serviceRoleKey)}.`,
  );
}

writeFileSync(
  envPath,
  [
    `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
    '',
  ].join('\n'),
  { mode: 0o600, flag: 'wx' },
);
chmodSync(envPath, 0o600);
process.stdout.write(`Wrote local Supabase settings to ${envPath}; values were not displayed.\n`);
