export const dateKey = (d = new Date()) => d.toLocaleDateString('en-CA');
export const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export const isoWithOffset = (d = new Date()) => {
  const z = -d.getTimezoneOffset(), sign = z >= 0 ? '+' : '-'; const pad = (n:number) => String(Math.abs(Math.trunc(n))).padStart(2,'0');
  return `${dateKey(d)}T${d.toTimeString().slice(0,8)}${sign}${pad(z / 60)}:${pad(z % 60)}`;
};
export const displayDate = (iso:string) => new Date(iso).toLocaleDateString(undefined, { month:'long', day:'numeric', year:'numeric' });
export const displayTime = (iso:string) => new Date(iso).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });
