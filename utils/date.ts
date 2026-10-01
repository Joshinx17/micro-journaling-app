export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export const isoWithOffset = (d = new Date()) => {
  const z = -d.getTimezoneOffset(), sign = z >= 0 ? '+' : '-'; const pad = (n:number) => String(Math.abs(Math.trunc(n))).padStart(2,'0');
  return `${dateKey(d)}T${d.toTimeString().slice(0,8)}${sign}${pad(z / 60)}:${pad(z % 60)}`;
};
// Render the local wall-clock values stored in the entry, even after device travel.
export const displayDate = (iso:string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(undefined, { month:'long', day:'numeric', year:'numeric', timeZone: 'UTC' });
export const displayTime = (iso:string) => new Date(`2000-01-01T${iso.slice(11, 19)}Z`).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit', timeZone: 'UTC' });
