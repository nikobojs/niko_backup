import { type BackupJob, config } from "../config";
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export async function backupDone(
  job: BackupJob,
  stateFilePath: string,
) {
  const name = job.name;
  const now = new Date();

  await ensureStateFileExists(stateFilePath);
  await updateStateFile(stateFilePath, name, now);
}

async function ensureStateFileExists(stateFilePath: string) {
  if (!existsSync(stateFilePath)) {
    console.log('creating new state file')
    await createStateFile(stateFilePath);
  }
}

export async function isTimeForBackup(path: string, job: BackupJob): Promise<boolean> {
  const now = new Date();
  await ensureStateFileExists(path);
  const fileContent = await readFile(path, 'utf8');
  const currentState = JSON.parse(fileContent);
  if (!Object.keys(currentState).includes(job.name)) {
    return true;
  } else {

    const lastBackup = new Date(currentState[job.name]);
    if (isNaN(lastBackup.getTime())) {
      throw new Error('Could not read date from state. State is corrupted.')
    }

    const targetDate = new Date(lastBackup);
    targetDate.setDate(lastBackup.getDate() + job.keep_in_days);
    const result = now.getTime() > targetDate.getTime();
    return result;
  }
}

async function createStateFile(path: string) {
  // TODO: create a new empty file
  try {
    await writeFile(path, '{}');
  } catch (error) {
    console.error(`Error creating state file at ${path}: ${error}`);
  }
}

async function updateStateFile(path: string, name: string, date: Date) {
  // overwrite value for key with `name`. Set value to parsed date
  try {
    await ensureStateFileExists(path);
    const fileContent = await readFile(path, 'utf8');
    const currentState = JSON.parse(fileContent);
    currentState[name] = date.toISOString();
    await writeFile(path, JSON.stringify(currentState, null, 2));
  } catch (error) {
    console.error(`Error updating state file at ${path}: ${error}`);
  }
}
