import { baseUrl } from './env.ts';

/**
 * Signs in through the shop's API and returns its session cookie. Signing in this way, rather than
 * typing the password into the form, keeps screenshots available to the agent for the whole session
 * (e2e withholds pixels after a secret is typed on screen).
 */
export async function sessionCookie(email: string, password: string): Promise<{ name: string; value: string }> {
  const response = await fetch(new URL('/api/auth/login', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Signing in as ${email} failed: HTTP ${response.status} ${await response.text()}`);
  const session = response.headers.getSetCookie().find((c) => c.startsWith('halden_session='));
  if (!session) throw new Error(`Signing in as ${email} set no session cookie.`);
  const [pair = ''] = session.split(';');
  const [name = '', value = ''] = pair.split('=');
  return { name, value };
}
