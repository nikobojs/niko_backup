import { type BackupConfig } from "../config"
import * as fs from 'node:fs/promises'
import { extractDateFromFileName } from "../helpers";

export async function deleteOldFiles(config: BackupConfig) {
  const now = new Date();
  const backupsToDelete: string[] = []
  const backupFiles = await fs.readdir(config.outputDir);

  // loop through each backup and delete the old ones
  for (const file of backupFiles) {
    const backupDate = extractDateFromFileName(file);
    if (!backupDate || isNaN(backupDate.getTime())) {
      console.warn('You seem to have a weird file in your output folder: ' + file);
      continue;
    }
    
    const relatedBackupJob = config.backups.find(b => file.startsWith(b.name + '.'));
    if (!relatedBackupJob) {
      console.warn('Unrecognized backup file. Will never delete it: ' + file);
      continue;
    }

    // calculate deletionDate based on relatedBackupJob.keep_in_days
    const deletionDate = new Date(backupDate.getTime());
    deletionDate.setDate(backupDate.getDate() + relatedBackupJob?.keep_in_days)

    // if now is after deletionDate, delete the file
    if (now.getTime() > deletionDate.getTime()) {
      backupsToDelete.push(config.outputDir + '/' + file);
    }
  }

  console.info('> deleting following backups:', backupsToDelete);
  for (const file of backupsToDelete) {
    await fs.unlink(file)
  }
}