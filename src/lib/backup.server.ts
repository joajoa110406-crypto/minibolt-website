import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─── 타입 정의 ─────────────────────────────────────────────────

export interface BackupMetadata {
  table: string;
  backup_time: string;
  row_count: number;
}

export interface BackupPayload {
  metadata: BackupMetadata;
  data: Record<string, unknown>[];
}

export interface BackupFile {
  name: string;
  path: string;
  size: number;
  created_at: string;
  table: string;
}

export interface BackupResult {
  success: boolean;
  tables: {
    table: string;
    row_count: number;
    file_path: string;
    size: number;
  }[];
  errors: { table: string; error: string }[];
  deleted_old_files: number;
}

// ─── 상수 ──────────────────────────────────────────────────────

const BUCKET_NAME = 'minibolt-backups';
const BACKUP_TABLES = ['orders', 'order_items', 'product_stock', 'stock_logs', 'refunds'] as const;
const DEFAULT_RETENTION_DAYS = 90;

// ─── 유틸리티 ──────────────────────────────────────────────────

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function extractTableFromPath(path: string): string {
  // 파일명 형식: {table}-{YYYYMMDD-HHmmss}.json
  const filename = path.split('/').pop() || '';
  const match = filename.match(/^(.+)-\d{8}-\d{6}\.json$/);
  return match ? match[1] : 'unknown';
}

// ─── 핵심 함수 ─────────────────────────────────────────────────

/**
 * 모든 백업 대상 테이블을 Supabase Storage에 JSON 백업
 */
export async function createBackup(): Promise<BackupResult> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  // KST 기준 시간
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const timestamp = formatDate(kst);

  const result: BackupResult = {
    success: true,
    tables: [],
    errors: [],
    deleted_old_files: 0,
  };

  // 버킷 존재 여부 확인 (없으면 생성 시도)
  const { error: bucketError } = await supabase.storage.getBucket(BUCKET_NAME);
  if (bucketError) {
    console.log(`[backup] 버킷 '${BUCKET_NAME}'이 없습니다. 생성을 시도합니다.`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
    });
    if (createError) {
      console.error(`[backup] 버킷 생성 실패: ${createError.message}`);
      result.success = false;
      result.errors.push({ table: '*', error: `버킷 생성 실패: ${createError.message}` });
      return result;
    }
    console.log(`[backup] 버킷 '${BUCKET_NAME}' 생성 완료`);
  }

  for (const table of BACKUP_TABLES) {
    try {
      // 전체 데이터 조회 (Service Role이므로 RLS 우회)
      const { data, error } = await supabase.from(table).select('*');

      if (error) {
        result.errors.push({ table, error: error.message });
        result.success = false;
        continue;
      }

      const rows = data || [];
      const payload: BackupPayload = {
        metadata: {
          table,
          backup_time: kst.toISOString(),
          row_count: rows.length,
        },
        data: rows,
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const filePath = `${table}-${timestamp}.json`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, jsonStr, {
          contentType: 'application/json',
          upsert: false,
        });

      if (uploadError) {
        result.errors.push({ table, error: uploadError.message });
        result.success = false;
        continue;
      }

      result.tables.push({
        table,
        row_count: rows.length,
        file_path: filePath,
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ table, error: msg });
      result.success = false;
    }
  }

  // 오래된 백업 자동 삭제
  try {
    result.deleted_old_files = await deleteOldBackups(DEFAULT_RETENTION_DAYS);
  } catch (err) {
    console.warn('[backup] 오래된 백업 삭제 실패:', err);
  }

  return result;
}

/**
 * 백업 파일 목록 조회
 */
export async function listBackups(): Promise<BackupFile[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', {
    limit: 500,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) {
    console.error('[backup] 목록 조회 오류:', error.message);
    throw new Error(`백업 목록 조회 실패: ${error.message}`);
  }

  return (data || [])
    .filter((f) => f.name.endsWith('.json'))
    .map((f) => ({
      name: f.name,
      path: f.name,
      size: f.metadata?.size ?? 0,
      created_at: f.created_at || '',
      table: extractTableFromPath(f.name),
    }));
}

/**
 * 특정 백업 파일 다운로드 (JSON 문자열 반환)
 */
export async function downloadBackup(path: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);

  if (error) {
    throw new Error(`백업 다운로드 실패: ${error.message}`);
  }

  return await data.text();
}

/**
 * 보관 기간이 지난 백업 자동 삭제
 * @param retentionDays 보관 일수 (기본 90일)
 * @returns 삭제된 파일 수
 */
export async function deleteOldBackups(retentionDays: number = DEFAULT_RETENTION_DAYS): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list('', {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'asc' },
  });

  if (error || !files) {
    console.warn('[backup] 파일 목록 조회 실패:', error?.message);
    return 0;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const oldFiles = files.filter((f) => {
    if (!f.created_at) return false;
    return new Date(f.created_at) < cutoff;
  });

  if (oldFiles.length === 0) return 0;

  const pathsToDelete = oldFiles.map((f) => f.name);
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(pathsToDelete);

  if (deleteError) {
    console.warn('[backup] 삭제 오류:', deleteError.message);
    return 0;
  }

  console.log(`[backup] ${pathsToDelete.length}개 오래된 백업 삭제 완료`);
  return pathsToDelete.length;
}

/**
 * 특정 백업 파일 삭제
 */
export async function deleteBackup(path: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(`백업 삭제 실패: ${error.message}`);
  }
}
