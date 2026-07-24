import { Objective } from '../components/Settings';

export function getObjectiveAccountNumber(obj: Objective, accounts: any[]): string | null {
  if (obj.type !== 'account') return null;
  const acc = accounts.find(a => a.id === obj.targetId);
  if (acc && acc.accountNumber) {
    return String(acc.accountNumber).trim();
  }
  // Check if targetId itself is an accountNumber
  const accByNum = accounts.find(a => String(a.accountNumber).trim() === String(obj.targetId).trim());
  if (accByNum && accByNum.accountNumber) {
    return String(accByNum.accountNumber).trim();
  }
  return null;
}

export function findObjectiveForAccount(objectives: Objective[], account: any, allAccounts: any[]): Objective | undefined {
  if (!account) return undefined;
  const targetAccNum = String(account.accountNumber || '').trim();

  return objectives.find(obj => {
    if (obj.type !== 'account') return false;
    if (obj.targetId === account.id) return true;
    if (targetAccNum) {
      const accNum = getObjectiveAccountNumber(obj, allAccounts);
      if (accNum && accNum === targetAccNum) return true;
    }
    return false;
  });
}

export function findExistingObjectiveForTarget(
  objectives: Objective[],
  type: 'account' | 'market',
  targetId: string,
  accounts: any[],
  currentObjectiveId?: string
): Objective | undefined {
  const selectedAcc = accounts.find(a => a.id === targetId);
  const selectedAccNum = selectedAcc?.accountNumber ? String(selectedAcc.accountNumber).trim() : null;

  return objectives.find(o => {
    if (currentObjectiveId && o.id === currentObjectiveId) return false;
    if (o.type !== type) return false;

    if (type === 'market') {
      return o.targetId === targetId;
    } else {
      // type === 'account'
      if (o.targetId === targetId) return true;
      if (selectedAccNum) {
        const oAccNum = getObjectiveAccountNumber(o, accounts);
        if (oAccNum && oAccNum === selectedAccNum) return true;
      }
      return false;
    }
  });
}

export function deduplicateObjectives(rawObjectives: Objective[], accounts: any[]): { cleanObjectives: Objective[]; duplicateIds: string[] } {
  const seenAccountNumbers = new Set<string>();
  const seenMarketTargets = new Set<string>();
  const seenTargetIds = new Set<string>();
  
  const cleanObjectives: Objective[] = [];
  const duplicateIds: string[] = [];

  for (const obj of rawObjectives) {
    if (!obj || !obj.targetId) continue;

    if (obj.type === 'account') {
      const acc = accounts.find(a => a.id === obj.targetId);
      const accNum = acc?.accountNumber ? String(acc.accountNumber).trim() : null;

      let isDuplicate = false;
      if (seenTargetIds.has(obj.targetId)) {
        isDuplicate = true;
      } else if (accNum && seenAccountNumbers.has(accNum)) {
        isDuplicate = true;
      }

      if (isDuplicate) {
        if (obj.id) duplicateIds.push(obj.id);
      } else {
        seenTargetIds.add(obj.targetId);
        if (accNum) seenAccountNumbers.add(accNum);
        cleanObjectives.push(obj);
      }
    } else {
      // type === 'market'
      if (seenMarketTargets.has(obj.targetId)) {
        if (obj.id) duplicateIds.push(obj.id);
      } else {
        seenMarketTargets.add(obj.targetId);
        cleanObjectives.push(obj);
      }
    }
  }

  return { cleanObjectives, duplicateIds };
}
