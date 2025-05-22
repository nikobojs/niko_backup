import type { BackupJob } from "../config"
import { getFileNameFriendlyDate } from "../helpers";
import { parseAndNotify, sendSuccessNoti } from './notifier';
import { backupFileToSecondLocation } from "./rclone";
import { resetBackupTimer } from "./state"
import { execSync } from "child_process";

const tenMinutes = 10 * 60 * 1000;

export async function backupPostgres(job: BackupJob, stateFilePath: string) {
  console.log('Backing up postgres:', job.target)

  if (job.encrypt && !job.encrypt_pass) {
    throw new Error('No \'encrypt_pass\' was defined in job with encryption flag');
  }

  const time = getFileNameFriendlyDate(new Date());
  const resultPath = `output/${job.name}.${time}.gz` + (job.encrypt ? '.enc' : '');
  const psqlCheckCmd = `PGCONNECT_TIMEOUT=3 psql ${job.target} -c 'SELECT 1'`;
  const mkdirCmd = 'mkdir -p output';
  const pgDumpCmd = `${job.pg_dump || 'pg_dump'} -x -O ${job.target}`
  const dumpCmd = `${pgDumpCmd} --no-reconnect | gzip > ${resultPath}`;
  const dumpEncryptCmd = `${pgDumpCmd} | gzip | openssl enc -e -aes256 -pass pass:${job.encrypt_pass} -out ${resultPath}`;

  try {
    // check if there is postgres connection, report err if not
    execSync(psqlCheckCmd, {
      timeout: 2000,
    });

    // ensure dir exists
    execSync(mkdirCmd);

    // call it. call it NOW!
    execSync(job.encrypt ? dumpEncryptCmd : dumpCmd, {
      timeout: tenMinutes,
    });

    // backup postgres to second location if enabled
    if (!job.disable_second_location) {
      await backupFileToSecondLocation(job, resultPath);
    }

    // send success notification
    await sendSuccessNoti(job.name);
  } catch(e: any) {
    // parse and report error
    console.error(e)
    await parseAndNotify(job, e);
  }

  // reset backup timer no matter if it went well or not
  await resetBackupTimer(job, stateFilePath);
}
