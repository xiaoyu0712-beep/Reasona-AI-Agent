import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import type { ReasonaDatabase } from './db.js';
import type { AppConfig } from './env.js';
import type { AuthenticatedUser } from './types.js';
import { appendAudit } from './domain.js';

const iso = (date: Date) => date.toISOString();
const cookieName = 'reasona_session';
const oauthStateCookie = 'reasona_oauth_state';
const oauth = new OAuth2Client();

function sessionSignature(sid: string, config: AppConfig): string {
  const secret = config.SESSION_SECRET || config.GOOGLE_CLIENT_SECRET || '';
  return createHmac('sha256', secret).update(sid).digest('base64url');
}

function signedSession(sid: string, config: AppConfig): string { return `${sid}.${sessionSignature(sid, config)}`; }

function verifiedSession(value: unknown, config: AppConfig): string | null {
  if (typeof value !== 'string' || value.length > 200) return null;
  const [sid, signature, extra] = value.split('.');
  if (!sid || !signature || extra !== undefined) return null;
  const expected = sessionSignature(sid, config);
  const receivedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) return null;
  return sid;
}

function setSessionCookie(res: Response, value: string, secure: boolean) {
  res.cookie(cookieName, value, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function requireUser(db: ReasonaDatabase, config: AppConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (config.AUTH_MODE === 'local' && config.NODE_ENV !== 'production') {
      const id = 'local-workspace-user';
      const user = db.prepare('SELECT * FROM users WHERE id=?').get(id) as { id: string; email: string; name: string } | undefined;
      if (!user) db.prepare('INSERT INTO users(id,email,name,auth_mode,created_at) VALUES(?,?,?,?,?)')
        .run(id, 'local@reasona.invalid', '本機工作區', 'local', iso(new Date()));
      (req as Request & { user: AuthenticatedUser }).user = { id, email: 'local@reasona.invalid', name: '本機工作區', authMode: 'local' };
      next(); return;
    }
    const sid = verifiedSession(req.cookies?.[cookieName], config);
    if (!sid) { res.status(401).json({ error: 'authentication_required' }); return; }
    const session = db.prepare(`SELECT u.id,u.email,u.name,u.auth_mode,s.expires_at FROM sessions s
      JOIN users u ON u.id=s.user_id WHERE s.id=?`).get(sid) as { id: string; email: string; name: string; auth_mode: string; expires_at: string } | undefined;
    if (!session || session.expires_at <= iso(new Date())) {
      db.prepare('DELETE FROM sessions WHERE id=?').run(sid);
      res.clearCookie(cookieName, { path: '/', sameSite: 'lax' }); res.status(401).json({ error: 'authentication_required' }); return;
    }
    (req as Request & { user: AuthenticatedUser }).user = { id: session.id, email: session.email, name: session.name, authMode: 'google' };
    next();
  };
}

export function getUser(req: Request): AuthenticatedUser {
  const user = (req as Request & { user?: AuthenticatedUser }).user;
  if (!user) throw new Error('AUTH_CONTEXT_MISSING');
  return user;
}

export function enforceSameOrigin(req: Request, res: Response, next: NextFunction, appOrigin?: string) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
  const origin = req.get('origin');
  const host = req.get('host');
  const forwardedProto = req.get('x-forwarded-proto');
  let expected = host ? `${forwardedProto === 'https' ? 'https' : req.protocol}://${host}` : '';
  if (appOrigin) {
    try { expected = new URL(appOrigin).origin; } catch { expected = ''; }
  }
  if (!origin || origin !== expected) { res.status(403).json({ error: 'same_origin_required' }); return; }
  next();
}

export function secureCookie(config: AppConfig) {
  return config.NODE_ENV === 'production' || config.COOKIE_SECURE === 'true';
}

export async function startGoogleLogin(db: ReasonaDatabase, config: AppConfig, res: Response) {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI) {
    res.status(503).json({ error: 'google_oauth_not_configured', message: 'Google OAuth 尚未設定；尚未連線或取得使用者同意。' }); return;
  }
  const state = randomBytes(32).toString('hex');
  const nonce = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 10 * 60 * 1000);
  db.prepare('INSERT INTO oauth_states(state,nonce,expires_at,created_at) VALUES(?,?,?,?)')
    .run(state, nonce, iso(expiry), iso(new Date()));
  res.cookie(oauthStateCookie, state, { httpOnly: true, sameSite: 'lax', secure: secureCookie(config), path: '/api/auth/google', maxAge: 10 * 60 * 1000 });
  const client = new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
  res.redirect(client.generateAuthUrl({ access_type: 'online', scope: ['openid', 'email', 'profile'], state, nonce, prompt: 'select_account' }));
}

export async function completeGoogleLogin(db: ReasonaDatabase, config: AppConfig, query: { code?: string; state?: string; cookieState?: string }, res: Response) {
  res.clearCookie(oauthStateCookie, { httpOnly: true, sameSite: 'lax', secure: secureCookie(config), path: '/api/auth/google' });
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI) {
    res.status(503).send('Google OAuth 尚未設定；未完成登入。'); return;
  }
  if (!query.code || !query.state || !query.cookieState || query.state.length > 200) { res.status(400).send('OAuth callback 缺少必要參數或瀏覽器綁定。'); return; }
  const stateBytes = Buffer.from(query.state);
  const cookieStateBytes = Buffer.from(query.cookieState);
  if (stateBytes.length !== cookieStateBytes.length || !timingSafeEqual(stateBytes, cookieStateBytes)) { res.status(400).send('OAuth state 與發起登入的瀏覽器不相符。'); return; }
  const row = db.prepare('SELECT * FROM oauth_states WHERE state=?').get(query.state) as { state: string; nonce: string; expires_at: string } | undefined;
  db.prepare('DELETE FROM oauth_states WHERE state=?').run(query.state);
  if (!row || row.expires_at <= iso(new Date())) { res.status(400).send('OAuth state 無效或已逾期。'); return; }
  const client = new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
  try {
    const { tokens } = await client.getToken(query.code);
    if (!tokens.id_token) throw new Error('Missing ID token');
    const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: config.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload || payload.iss !== 'https://accounts.google.com' || payload.nonce !== row.nonce || !payload.email || !payload.email_verified || !payload.sub) {
      throw new Error('Issuer, nonce, subject, or verified email validation failed');
    }
    const at = iso(new Date());
    const userId = `google:${payload.sub}`;
    const sid = randomBytes(32).toString('base64url');
    const expires = iso(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO users(id,email,name,auth_mode,created_at) VALUES(?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name`)
        .run(userId, payload.email!, payload.name || payload.email!, 'google', at);
      db.prepare('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(sid, userId, expires, at);
      appendAudit(db, userId, userId, 'auth.google_login', 'user', userId, { issuer: 'https://accounts.google.com' });
    });
    tx(); setSessionCookie(res, signedSession(sid, config), secureCookie(config)); res.redirect('/');
  } catch {
    res.status(401).send('Google ID token 驗證失敗；未建立登入 session。');
  }
}

export function logout(db: ReasonaDatabase, req: Request, res: Response, config: AppConfig) {
  const sid = verifiedSession(req.cookies?.[cookieName], config);
  if (sid) {
    const session = db.prepare('SELECT user_id FROM sessions WHERE id=?').get(sid) as { user_id: string } | undefined;
    if (session) appendAudit(db, session.user_id, session.user_id, 'auth.logout', 'session', sid);
    db.prepare('DELETE FROM sessions WHERE id=?').run(sid);
  }
  res.clearCookie(cookieName, { httpOnly: true, sameSite: 'lax', secure: secureCookie(config), path: '/' });
  res.status(204).end();
}
