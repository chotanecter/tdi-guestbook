import { cookies } from 'next/headers';

export function isAdmin(): boolean {
  const c = cookies().get('tdi_admin')?.value;
  return !!c && c === process.env.ADMIN_PASSWORD;
}
