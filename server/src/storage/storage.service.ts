import { Injectable, InternalServerErrorException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { RequestContext } from '../context/request-context';

// Receipts live in a private Supabase Storage bucket, one folder per user, and
// are only ever reached through short-lived signed URLs minted here with the
// service-role key. The browser uploads straight to Supabase via a signed
// upload URL (bypassing this backend), and reads via a signed download URL.
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

@Injectable()
export class StorageService {
  private readonly client: SupabaseClient | null;
  private readonly bucket: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucket = process.env.SUPABASE_BUCKET ?? 'finsight';
    // Absent config (e.g. a dev machine without secrets) must not crash boot —
    // the storage endpoints just fail clearly when actually called.
    this.client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  }

  get enabled() { return this.client !== null; }

  private db(): SupabaseClient {
    if (!this.client) throw new InternalServerErrorException('Storage is not configured');
    return this.client;
  }

  // A user's private folder. Auth0 subs contain characters like "|", so the id
  // is sanitized to keep object keys clean and predictable.
  private prefix(userId: string) {
    return `receipts/${userId.replace(/[^a-zA-Z0-9]/g, '_')}/`;
  }

  private requireUser(): string {
    const userId = RequestContext.getUserId();
    if (!userId) throw new ForbiddenException('No user context');
    return userId;
  }

  // A path is the current user's iff it sits under their folder — the guard for
  // every view/delete so one user can never sign or remove another's receipts.
  private assertOwned(path: string, prefix: string) {
    if (!path.startsWith(prefix)) throw new ForbiddenException('Not your file');
  }

  // One signed upload URL per file the browser wants to send. Returns the
  // storage path (persisted on the transaction) and the URL to PUT the bytes to.
  async createUploadUrls(contentTypes: string[]): Promise<{ path: string; uploadUrl: string; contentType: string }[]> {
    const userId = this.requireUser();
    if (!contentTypes?.length) throw new BadRequestException('No files requested');
    if (contentTypes.length > 10) throw new BadRequestException('Too many files at once');
    const prefix = this.prefix(userId);
    return Promise.all(contentTypes.map(async (ct) => {
      const ext = EXT_BY_TYPE[ct?.toLowerCase()];
      if (!ext) throw new BadRequestException(`Unsupported file type: ${ct}`);
      const path = `${prefix}${randomUUID()}.${ext}`;
      const { data, error } = await this.db().storage.from(this.bucket).createSignedUploadUrl(path);
      if (error || !data) throw new InternalServerErrorException(error?.message ?? 'Could not create upload URL');
      return { path, uploadUrl: data.signedUrl, contentType: ct };
    }));
  }

  // Short-lived download URLs for the browser to render private receipts.
  async createViewUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
    const userId = this.requireUser();
    if (!paths?.length) return {};
    const prefix = this.prefix(userId);
    paths.forEach(p => this.assertOwned(p, prefix));
    const { data, error } = await this.db().storage.from(this.bucket).createSignedUrls(paths, expiresIn);
    if (error) throw new InternalServerErrorException(error.message);
    const out: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) out[row.path] = row.signedUrl;
    }
    return out;
  }

  // Delete objects. Called when a receipt is removed or its transaction is
  // deleted. Silently no-ops when storage isn't configured, so a missing bucket
  // never blocks a transaction delete.
  async remove(paths: string[]) {
    if (!this.client || !paths?.length) return;
    const userId = RequestContext.getUserId();
    if (!userId) return;
    const prefix = this.prefix(userId);
    const owned = paths.filter(p => p.startsWith(prefix));
    if (owned.length) await this.client.storage.from(this.bucket).remove(owned);
  }
}
