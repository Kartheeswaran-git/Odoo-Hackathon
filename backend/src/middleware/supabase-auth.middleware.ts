import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const authClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export async function requireSupabaseUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  if (!authClient) {
    response.status(503).json({ error: 'Supabase Auth is not configured.' });
    return;
  }

  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    response.status(401).json({ error: 'A Supabase bearer token is required.' });
    return;
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    response.status(401).json({ error: 'The Supabase session is invalid or expired.' });
    return;
  }

  request.authUserId = data.user.id;
  next();
}
