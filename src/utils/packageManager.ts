import { api } from '../api/client.js';

export interface CablePackage {
  id: string; // 'BASIC' | 'STANDARD' | 'PREMIUM_HD' | 'CUSTOM'
  name: string;
  shortName: string;
  monthlyFee: number;
  channelsCount: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
}

export const DEFAULT_CABLE_PACKAGES: CablePackage[] = [
  {
    id: 'BASIC',
    name: 'Basic Package',
    shortName: 'Basic',
    monthlyFee: 600,
    channelsCount: '45+ SD Channels',
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    description: 'Essential local, news & entertainment channels (LKR 600/mo).',
  },
  {
    id: 'STANDARD',
    name: 'Standard Package',
    shortName: 'Standard',
    monthlyFee: 1200,
    channelsCount: '90+ SD & HD Channels',
    color: 'from-blue-500 to-indigo-600',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    description: 'Most popular family package with movies, sports, music & news (LKR 1,200/mo).',
  },
  {
    id: 'PREMIUM_HD',
    name: 'Premium HD Package',
    shortName: 'Premium HD',
    monthlyFee: 1800,
    channelsCount: '140+ Full HD & 4K Channels',
    color: 'from-purple-500 to-pink-600',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400',
    description: 'Complete sports, international movies, kids, documentary & HD channels (LKR 1,800/mo).',
  },
];

export interface CustomerPackageAssignment {
  packageId: string;
  packageName: string;
  monthlyFee: number;
  updatedAt?: string;
}

const STORAGE_KEY_PACKAGES = 'ask_cable_packages';
const STORAGE_KEY_ASSIGNMENTS = 'ask_cable_customer_packages';

// In-memory caches for synchronous components
let cachedPackages: CablePackage[] = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PACKAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_CABLE_PACKAGES;
})();

let cachedAssignments: Record<string, CustomerPackageAssignment> = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
})();

/**
 * Returns currently configured cable packages
 */
export function getCablePackages(): CablePackage[] {
  return cachedPackages;
}

/**
 * Save updated cable packages (Admin price customization)
 */
export async function saveCablePackages(packages: CablePackage[]): Promise<void> {
  cachedPackages = packages;
  try {
    localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(packages));
  } catch {}
  for (const pkg of packages) {
    try {
      await api.saveCablePackage(pkg);
    } catch (err) {
      console.warn(`Failed to persist package ${pkg.id} to packages table:`, err);
    }
  }
}

/**
 * Sync packages from dedicated packages table on startup
 */
export async function syncCablePackagesFromDb(): Promise<CablePackage[]> {
  try {
    const pkgs = await api.getCablePackages();
    if (Array.isArray(pkgs) && pkgs.length > 0) {
      cachedPackages = pkgs;
      try {
        localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(pkgs));
      } catch {}
      return pkgs;
    }
  } catch (e) {
    console.warn('Failed to fetch packages from packages table:', e);
  }
  return cachedPackages;
}

/**
 * Get package assignment for a given customer object, customer ID, or Box No
 */
export function getCustomerPackage(customerOrKey?: any): CustomerPackageAssignment {
  if (!customerOrKey) {
    const std = cachedPackages.find((p) => p.id === 'STANDARD') || cachedPackages[1] || cachedPackages[0];
    return {
      packageId: std.id,
      packageName: std.name,
      monthlyFee: std.monthlyFee,
    };
  }

  // If customer object was passed
  if (typeof customerOrKey === 'object') {
    if (customerOrKey.packageId && customerOrKey.packageName) {
      return {
        packageId: customerOrKey.packageId,
        packageName: customerOrKey.packageName,
        monthlyFee: customerOrKey.monthlyFee !== undefined && customerOrKey.monthlyFee !== null ? Number(customerOrKey.monthlyFee) : 1200,
      };
    }
    const key = (customerOrKey.id || customerOrKey.boxNo || '').trim().toLowerCase();
    if (key && cachedAssignments[key]) {
      return cachedAssignments[key];
    }
  } else if (typeof customerOrKey === 'string') {
    const cleanKey = customerOrKey.trim().toLowerCase();
    if (cachedAssignments[cleanKey]) {
      return cachedAssignments[cleanKey];
    }
  }

  // Fallback to Standard Package (LKR 1,200)
  const std = cachedPackages.find((p) => p.id === 'STANDARD') || cachedPackages[1] || cachedPackages[0];
  return {
    packageId: std.id,
    packageName: std.name,
    monthlyFee: std.monthlyFee,
  };
}

/**
 * Assign package to a customer (by ID and/or Box No) in customer_packages table
 */
export async function setCustomerPackage(
  customerIdentifier: { id?: string; boxNo?: string },
  assignment: CustomerPackageAssignment
): Promise<void> {
  const updated = { ...cachedAssignments };
  const stamp = new Date().toISOString();
  const fee = assignment.monthlyFee !== undefined && assignment.monthlyFee !== null && !isNaN(Number(assignment.monthlyFee))
    ? Number(assignment.monthlyFee)
    : 1200;
  const cleanAssignment = { ...assignment, monthlyFee: fee, updatedAt: stamp };

  if (customerIdentifier.id) {
    updated[customerIdentifier.id.trim().toLowerCase()] = cleanAssignment;
  }
  if (customerIdentifier.boxNo) {
    updated[customerIdentifier.boxNo.trim().toLowerCase()] = cleanAssignment;
  }

  cachedAssignments = updated;

  try {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(updated));
  } catch {}

  try {
    await api.setCustomerPackage(customerIdentifier, cleanAssignment);
  } catch (err) {
    console.warn('Failed to persist customer package assignment to customer_packages table:', err);
  }
}

/**
 * Populate package assignments in-memory directly from customer records (no API call needed)
 */
export function populateAssignmentsFromCustomers(customers: any[]): Record<string, CustomerPackageAssignment> {
  const updated = { ...cachedAssignments };
  for (const c of (customers || [])) {
    if (c.packageId || c.packageName) {
      const pkgData: CustomerPackageAssignment = {
        packageId: c.packageId || 'STANDARD',
        packageName: c.packageName || 'Standard Package',
        monthlyFee: c.monthlyFee !== undefined && c.monthlyFee !== null ? Number(c.monthlyFee) : 1200,
        updatedAt: c.createdAt || new Date().toISOString(),
      };
      if (c.id) updated[String(c.id).trim().toLowerCase()] = pkgData;
      if (c.boxNo) updated[String(c.boxNo).trim().toLowerCase()] = pkgData;
    }
  }
  cachedAssignments = updated;
  try {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(updated));
  } catch {}
  return updated;
}

/**
 * Sync customer package assignments from customer_packages table
 */
export async function syncCustomerPackagesFromDb(): Promise<Record<string, CustomerPackageAssignment>> {
  try {
    const assignments = await api.getCustomerPackages();
    if (assignments && typeof assignments === 'object' && Object.keys(assignments).length > 0) {
      cachedAssignments = { ...cachedAssignments, ...assignments };
      try {
        localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(cachedAssignments));
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to sync customer packages from customer_packages table:', e);
  }
  return cachedAssignments;
}

/**
 * Returns all current customer package assignments
 */
export function getAllCustomerPackageAssignments(): Record<string, CustomerPackageAssignment> {
  return cachedAssignments;
}

/**
 * Returns package object by id
 */
export function getPackageById(packageId?: string | null): CablePackage {
  if (!packageId) return cachedPackages[1] || cachedPackages[0];
  return (
    cachedPackages.find((p) => p.id.toUpperCase() === packageId.toUpperCase()) ||
    cachedPackages[1] ||
    cachedPackages[0]
  );
}

/**
 * Add or update a package in the packages table and local cache
 */
export async function upsertCablePackage(pkg: CablePackage): Promise<CablePackage[]> {
  const existingIdx = cachedPackages.findIndex((p) => p.id.toUpperCase() === pkg.id.toUpperCase());
  let updatedList: CablePackage[];
  if (existingIdx >= 0) {
    updatedList = cachedPackages.map((p, idx) => (idx === existingIdx ? pkg : p));
  } else {
    updatedList = [...cachedPackages, pkg];
  }
  cachedPackages = updatedList;

  try {
    localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(updatedList));
  } catch {}

  try {
    await api.saveCablePackage(pkg);
  } catch (err) {
    console.warn('Failed to upsert package to packages table:', err);
  }
  return updatedList;
}

/**
 * Delete a package from packages table
 */
export async function deleteCablePackage(packageId: string): Promise<CablePackage[]> {
  const updatedList = cachedPackages.filter((p) => p.id.toUpperCase() !== packageId.toUpperCase());
  cachedPackages = updatedList;

  try {
    localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(updatedList));
  } catch {}

  try {
    await api.deleteCablePackage(packageId);
  } catch (err) {
    console.warn('Failed to delete package from packages table:', err);
  }
  return updatedList;
}

/**
 * Reset packages list back to factory defaults in packages table
 */
export async function resetCablePackagesToDefault(): Promise<CablePackage[]> {
  await saveCablePackages(DEFAULT_CABLE_PACKAGES);
  return DEFAULT_CABLE_PACKAGES;
}

