import * as yup from 'yup';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';


export type BackupJob = {
  name: string;
  encrypt: boolean;
  encrypt_pass?: string;
  s3_newer_than?: string;
  s3_download_limit?: string;
  upload_to_do: boolean;
  interval_days: number;
  keep_in_days: number;
  type: 'postgres' | 's3';
  target: string;
}

export type BackupConfig = {
  outputDir: string;
  stateFilePath: string;
  backups: BackupJob[]
}


const backupSchema: yup.ObjectSchema<BackupJob> = yup.object({
  name: yup.string().required(),
  encrypt: yup.boolean().required(),
  upload_to_do: yup.boolean().required(),
  interval_days: yup.number().required().min(1, '\'interval_days\' needs to be at least 1 day'),
  keep_in_days: yup.number().required().min(0, '\'keep_in_days\' cannot be negative'),
  type: yup.string().oneOf(['postgres', 's3'] as const).required(),
  target: yup.string().required().test('len', '\'target\' cannot be empty', val => !!val),
  encrypt_pass: yup.string().optional(),
  s3_newer_than: yup.string().optional(),
  s3_download_limit: yup.string().optional(),
});

const configSchema: yup.ObjectSchema<BackupConfig> = yup.object({
  outputDir: yup.string().required(),
  stateFilePath: yup.string().required(),
  backups: yup.array(backupSchema).min(1, 'You need at least one backup in your config').required(),
});


export async function validateBackupConfig(parsed: BackupJob): Promise<BackupJob> {
  if (parsed.type === 'postgres') {
    if (!parsed.target.startsWith('postgres://')) {
      throw new Error('Postgres URI did not start with \'postgres://\'');
    }
  } else if (parsed.type === 's3') {
    // TODO: validate minio string
    if (!parsed.s3_newer_than || !parsed.s3_download_limit) {
      throw new Error('\'s3_newer_than\' or \'s3_limit_download\' was not defined in config');
    }
  }

  if (parsed.encrypt && !parsed.encrypt_pass) {
    throw new Error('Backup config is missing \`encrypt_pass\' or \'encrypted\' needs to be false');
  }

  return parsed;
}

export async function config(path: string): Promise<BackupConfig> {
  const fileExists = existsSync(path);
  if (!fileExists) {
    throw new Error('Config file does not exist');
  }
  const rawConfig = await readFile(path, 'utf8');
  
  let json;
  try {
    json = JSON.parse(rawConfig);
  } catch {
    throw new Error('Config file is not in correct json format')
  }

  const parsedConfig = configSchema.validateSync(json);

  const promises = parsedConfig.backups.map(validateBackupConfig)
  await Promise.all(promises);

  return parsedConfig;
}
