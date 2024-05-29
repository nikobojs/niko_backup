import { config } from "./config";
import { deleteOldFiles } from "./services/deleter";
import { backupPostgres } from "./services/postgres";
import { backupS3 } from "./services/s3";
import { isTimeForBackup } from "./services/state";

async function run() {
  const cfg = await config();
  const backups = cfg.backups;

  for (const backup of backups) {
    const timeForBackup = await isTimeForBackup(cfg.stateFilePath, backup)
    if (!timeForBackup) {
      console.log('its not yet time for', backup.name);
      continue;
    }

    if (backup.type === 'postgres') {
      await backupPostgres(
          backup,
          cfg.stateFilePath,
      );
    } else if (backup.type === 's3') {
      await backupS3(
          backup,
          cfg.stateFilePath,
      );
    } else {
      
    }

  }

  console.info('> deleting old files...')
  await deleteOldFiles(cfg);
}

run();
