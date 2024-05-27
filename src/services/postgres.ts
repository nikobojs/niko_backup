import type { BackupJob } from "../config"
import { getFileNameFriendlyDate } from "../helpers";
import { backupDone } from "./state"
import { execSync } from "child_process";

export async function backupPostgres(job: BackupJob, stateFilePath: string) {
  console.log('Backing up postgres:', job.target)

  if (job.encrypt && !job.encrypt_pass) {
    throw new Error('No \'encrypt_pass\' was defined in job with encryption flag');
  }

  const time = getFileNameFriendlyDate(new Date());
  const resultPath = `output/${job.name}.${time}.gz` + (job.encrypt ? '.enc' : '');

  const mkdirCmd = 'mkdir -p output';
  const dumpCmd = `pg_dump -x -O ${job.target} | gzip > ${resultPath}`;
  const dumpEncryptCmd = `pg_dump -x -O ${job.target} | gzip | openssl enc -e -aes256 -pass pass:${job.encrypt_pass} -out ${resultPath}`;

  execSync(mkdirCmd);
  execSync(job.encrypt ? dumpEncryptCmd : dumpCmd);

  await backupDone(job, stateFilePath);
}