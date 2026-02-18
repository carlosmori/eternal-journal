import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

const ALLOWED_ROUTES: { method: string; pattern: RegExp }[] = [
  // Auth
  { method: 'GET', pattern: /^auth\/google$/ },
  { method: 'GET', pattern: /^auth\/google\/callback$/ },
  { method: 'GET', pattern: /^auth\/me$/ },
  { method: 'POST', pattern: /^auth\/refresh$/ },
  // Journal
  { method: 'GET', pattern: /^journal$/ },
  { method: 'POST', pattern: /^journal$/ },
  { method: 'PATCH', pattern: /^journal\/[\w-]+$/ },
  { method: 'DELETE', pattern: /^journal\/[\w-]+$/ },
  // Shared quotes
  { method: 'GET', pattern: /^shared-quotes\/batch$/ },
  { method: 'GET', pattern: /^shared-quotes\/mine$/ },
  { method: 'POST', pattern: /^shared-quotes$/ },
  { method: 'DELETE', pattern: /^shared-quotes\/[\w-]+$/ },
  // Admin
  { method: 'GET', pattern: /^admin\/shared-quotes$/ },
  { method: 'PATCH', pattern: /^admin\/shared-quotes\/[\w-]+$/ },
];

const FORWARDED_REQ_HEADERS = ['authorization', 'content-type', 'cookie', 'accept'];

const HOP_BY_HOP = new Set([
  'transfer-encoding',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'upgrade',
]);

function isAllowed(method: string, path: string): boolean {
  return ALLOWED_ROUTES.some((r) => r.method === method && r.pattern.test(path));
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join('/');

  if (!isAllowed(req.method, joined)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const target = new URL(`/${joined}`, BACKEND_URL);
  target.search = new URL(req.url).search;

  const headers: Record<string, string> = {};
  for (const key of FORWARDED_REQ_HEADERS) {
    const val = req.headers.get(key);
    if (val) headers[key] = val;
  }

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();

  let backendRes: Response;
  try {
    backendRes = await fetch(target.toString(), {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });
  } catch (err) {
    console.error('[proxy] fetch failed:', target.toString(), err);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }

  const resHeaders = new Headers();

  backendRes.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== 'set-cookie') {
      resHeaders.set(key, value);
    }
  });

  // Forward ALL Set-Cookie headers individually.
  // headers.get('set-cookie') silently collapses multiples — use getSetCookie() instead.
  const cookies = (backendRes.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();
  if (cookies) {
    for (const c of cookies) {
      resHeaders.append('set-cookie', c);
    }
  }

  if ([301, 302, 303, 307, 308].includes(backendRes.status)) {
    const location = backendRes.headers.get('location');
    if (location) resHeaders.set('location', location);
    return new NextResponse(null, { status: backendRes.status, headers: resHeaders });
  }

  const resBody = await backendRes.arrayBuffer();
  return new NextResponse(resBody, { status: backendRes.status, headers: resHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}
