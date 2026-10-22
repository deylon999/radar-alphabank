/** Куда вернуть после входа: только путь этого сайта, никаких внешних адресов. */
export function readNextPath(search: string): string {
  const next = new URLSearchParams(search).get('next');
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function loginPath(pathname: string, search: string): string {
  const back = `${pathname}${search}`;
  return back === '/' ? '/login' : `/login?next=${encodeURIComponent(back)}`;
}
