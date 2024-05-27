
import type { BackupJob } from "../config"
import { getFileNameFriendlyDate } from "../helpers";
import { backupDone } from "./state"
import { execSync, spawnSync } from "child_process";

export async function backupS3(job: BackupJob, stateFilePath: string) {
  const newerThan = job.s3_newer_than;
  const limitDownload = job.s3_download_limit;

  if (!newerThan || !limitDownload) {
    throw new Error('\'s3_newer_than\' or \'s3_limit_download\' was not defined in config');
  }

  console.log('Backing up minio:', job.target, { newerThan, limitDownload });

  if (job.encrypt && !job.encrypt_pass) {
    throw new Error('No \'encrypt_pass\' was defined in job with encryption flag');
  }

  // read if any files are present
  const checkCmd = `mc find ${job.target} --newer-than ${job.s3_newer_than}`;
  const anyFiles = spawnSync(checkCmd, { shell: true, encoding: 'utf8' });
  if (anyFiles.error) {
    throw anyFiles.error;
  } else {
    const filesToDownload = anyFiles.stdout.trim();
    const filesCount = filesToDownload.split('\n').length - 1;
    if (filesCount === 0) {
      console.warn('There are no files to download')
      await backupDone(job, stateFilePath)
      return;
    }
    console.log(`Downloading ${filesCount} files from s3..`)
  }

  const time = getFileNameFriendlyDate(new Date());
  const dirName = `${job.name}_${time}`;
  const tmpDir = `tmp/${dirName}`;
  const resultPath = `output/${dirName}.tar.gz` + (job.encrypt ? '.enc' : '');

  const mkdirOutputCmd = 'mkdir -p output';
  const mkdirTmpCmd = `mkdir -p ${tmpDir}`;
  const mirrorCmd = `mc mirror --limit-download ${limitDownload} --newer-than ${newerThan} ${job.target} ${tmpDir}`;
  const tarCmd = `tar -cvf ${resultPath} ${tmpDir}`;
  const tarCmdEncrypt = `tar -cvf - ${tmpDir} | openssl enc -e -aes256 -pass pass:${job.encrypt_pass} -out ${resultPath}`;
  const cleanupCmd = 'rm -r tmp';

  execSync(mkdirTmpCmd);
  execSync(mkdirOutputCmd);
  execSync(mirrorCmd);
  execSync(job.encrypt ? tarCmdEncrypt : tarCmd);
  execSync(cleanupCmd);

  await backupDone(job, stateFilePath)
}