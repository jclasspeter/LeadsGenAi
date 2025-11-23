
import { User } from '../types';

const DB_KEY = 'lead_gen_users_db';
const SESSION_KEY = 'lead_gen_active_session';

// Simulates network delay for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  /**
   * Simulates a database login query.
   */
  login: async (email: string, password: string): Promise<User> => {
    await delay(800);
    
    const usersRaw = localStorage.getItem(DB_KEY);
    const users: any[] = usersRaw ? JSON.parse(usersRaw) : [];

    // Find user in "Database"
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    // Create Session
    const sessionUser: User = { id: user.id, name: user.name, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  },

  /**
   * Simulates a database insert for a new user.
   */
  register: async (name: string, email: string, password: string): Promise<User> => {
    await delay(800);

    const usersRaw = localStorage.getItem(DB_KEY);
    const users: any[] = usersRaw ? JSON.parse(usersRaw) : [];

    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User already exists with this email.');
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name,
      email,
      password // In a real app, this would be hashed!
    };

    // Save to "Database"
    users.push(newUser);
    localStorage.setItem(DB_KEY, JSON.stringify(users));

    // Create Session
    const sessionUser: User = { id: newUser.id, name: newUser.name, email: newUser.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }
};
