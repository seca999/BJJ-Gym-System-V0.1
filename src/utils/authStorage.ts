import { SystemUser, UserRole } from '../types';
import { generateSalt, hashPassword, verifyPassword } from './cryptoUtils';

const USERS_STORAGE_KEY = 'bjj_gym_system_users_v1';
const ACTIVE_SESSION_KEY = 'bjj_gym_active_session_v1';
const SESSION_LAST_ACTIVE_KEY = 'bjj_gym_session_last_active_v1';
export const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes security auto-logout

/**
 * Record user activity to keep session active
 */
export function recordSessionActivity(): void {
  try {
    const now = Date.now().toString();
    sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, now);
    localStorage.setItem(SESSION_LAST_ACTIVE_KEY, now);
  } catch (e) {
    // ignore
  }
}

/**
 * Get timestamp of last user interaction
 */
export function getLastSessionActivity(): number {
  try {
    const raw = sessionStorage.getItem(SESSION_LAST_ACTIVE_KEY) || localStorage.getItem(SESSION_LAST_ACTIVE_KEY);
    if (raw) {
      const ts = parseInt(raw, 10);
      if (!isNaN(ts)) return ts;
    }
  } catch (e) {
    // ignore
  }
  return 0;
}

/**
 * Check if the active session has exceeded the 10-minute inactivity limit
 */
export function isSessionExpired(): boolean {
  const lastActive = getLastSessionActivity();
  if (!lastActive) return false;
  return Date.now() - lastActive > SESSION_TIMEOUT_MS;
}

// Initial default seeds if no users exist
const DEFAULT_SEED_SALT = 'e81a3d9b04f7a22c';
// SHA-256 hash of "admin123::e81a3d9b04f7a22c::BJJ_GYM_SECURE_V1"
let defaultAdminUserPromise: Promise<SystemUser> | null = null;

async function createDefaultAdminUser(): Promise<SystemUser> {
  const salt = generateSalt();
  const passwordHash = await hashPassword('admin123', salt);
  return {
    id: 'user_admin_001',
    username: 'admin',
    passwordHash,
    salt,
    fullName: 'Academy Head Administrator',
    role: 'admin',
    active: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Load system users from local storage or initialize default admin account
 */
export async function loadSystemUsers(): Promise<SystemUser[]> {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed: SystemUser[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load system users', e);
  }

  // If no users exist, create default admin account
  const defaultAdmin = await createDefaultAdminUser();
  const initialList = [defaultAdmin];
  saveSystemUsers(initialList);
  return initialList;
}

/**
 * Save system users list to local storage
 */
export function saveSystemUsers(users: SystemUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save system users', e);
  }
}

/**
 * Authenticate a user with username and password
 */
export async function authenticateUser(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  const users = await loadSystemUsers();
  const cleanUsername = usernameInput.trim().toLowerCase();

  const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

  if (!user) {
    return { success: false, error: 'Invalid username or password.' };
  }

  if (!user.active) {
    return { success: false, error: 'User account is deactivated. Please contact administrator.' };
  }

  const isValid = await verifyPassword(passwordInput, user.salt, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid username or password.' };
  }

  // Update last login
  const updatedUser = {
    ...user,
    lastLogin: new Date().toISOString(),
  };

  const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
  saveSystemUsers(updatedUsers);

  // Set session
  setSessionUser(updatedUser);

  return { success: true, user: updatedUser };
}

/**
 * Save or update a system user account
 */
export async function createOrUpdateUser(
  userData: {
    id?: string;
    username: string;
    fullName: string;
    role: UserRole;
    active: boolean;
    plainPassword?: string;
  }
): Promise<{ success: boolean; users: SystemUser[]; error?: string }> {
  const users = await loadSystemUsers();
  const cleanUsername = userData.username.trim().toLowerCase();

  if (!cleanUsername) {
    return { success: false, users, error: 'Username cannot be empty.' };
  }

  // Check unique username
  const existing = users.find(
    (u) => u.username.toLowerCase() === cleanUsername && u.id !== userData.id
  );
  if (existing) {
    return { success: false, users, error: `Username "${cleanUsername}" is already taken.` };
  }

  if (userData.id) {
    // Updating existing user
    const userIndex = users.findIndex((u) => u.id === userData.id);
    if (userIndex === -1) {
      return { success: false, users, error: 'User account not found.' };
    }

    const current = users[userIndex];
    let newSalt = current.salt;
    let newHash = current.passwordHash;

    if (userData.plainPassword && userData.plainPassword.trim()) {
      newSalt = generateSalt();
      newHash = await hashPassword(userData.plainPassword.trim(), newSalt);
    }

    const updated: SystemUser = {
      ...current,
      username: cleanUsername,
      fullName: userData.fullName.trim() || cleanUsername,
      role: userData.role,
      active: userData.active,
      salt: newSalt,
      passwordHash: newHash,
    };

    users[userIndex] = updated;
  } else {
    // Creating new user
    if (!userData.plainPassword || !userData.plainPassword.trim()) {
      return { success: false, users, error: 'Password is required for new user accounts.' };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(userData.plainPassword.trim(), salt);

    const newUser: SystemUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      fullName: userData.fullName.trim() || cleanUsername,
      role: userData.role,
      active: userData.active,
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
  }

  saveSystemUsers(users);

  // If active logged-in user modified their own details, update active session
  const sessionUser = getSessionUser();
  if (sessionUser && sessionUser.id === userData.id) {
    const freshUser = users.find((u) => u.id === sessionUser.id);
    if (freshUser) setSessionUser(freshUser);
  }

  return { success: true, users };
}

/**
 * Delete a system user account
 */
export async function deleteUserAccount(
  userId: string,
  activeAdminId?: string
): Promise<{ success: boolean; users: SystemUser[]; error?: string }> {
  let users = await loadSystemUsers();

  if (userId === activeAdminId) {
    return { success: false, users, error: 'You cannot delete your own active administrator account.' };
  }

  const target = users.find((u) => u.id === userId);
  if (!target) {
    return { success: false, users, error: 'User account not found.' };
  }

  // Ensure at least 1 active admin remains
  const adminCount = users.filter((u) => u.role === 'admin' && u.active && u.id !== userId).length;
  if (target.role === 'admin' && adminCount === 0) {
    return { success: false, users, error: 'System must have at least one active administrator.' };
  }

  users = users.filter((u) => u.id !== userId);
  saveSystemUsers(users);

  return { success: true, users };
}

/**
 * Active Session Management
 */
export function getSessionUser(): SystemUser | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_SESSION_KEY) || localStorage.getItem(ACTIVE_SESSION_KEY);
    if (raw) {
      if (isSessionExpired()) {
        clearSessionUser();
        return null;
      }
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to get session user', e);
  }
  return null;
}

export function setSessionUser(user: SystemUser): void {
  try {
    const val = JSON.stringify(user);
    sessionStorage.setItem(ACTIVE_SESSION_KEY, val);
    localStorage.setItem(ACTIVE_SESSION_KEY, val);
    recordSessionActivity();
  } catch (e) {
    console.error('Failed to set session user', e);
  }
}

export function clearSessionUser(): void {
  try {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    sessionStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
    localStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
  } catch (e) {
    console.error('Failed to clear session user', e);
  }
}
