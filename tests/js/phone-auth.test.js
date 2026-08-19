const fs = require('fs');
const path = require('path');

const phoneAuthJs = fs.readFileSync(path.resolve(__dirname, '../../js/phone-auth.js'), 'utf8');

describe('PhoneAuth Module', () => {
  beforeAll(() => {
    // Add TextEncoder to the window object for jsdom
    const { TextEncoder } = require('util');
    window.TextEncoder = TextEncoder;

    // Mock crypto.subtle.digest for password hashing
    Object.defineProperty(window, 'crypto', {
      value: {
        subtle: {
          digest: jest.fn().mockImplementation(async (algo, data) => {
            // Simple mock: just return a static buffer for tests
            return new Uint8Array([116, 101, 115, 116]).buffer; // 'test'
          })
        }
      },
      configurable: true
    });
    
    // Mock Firebase auth functions and UI callbacks
    window.signUp = jest.fn();
    window.signIn = jest.fn();
    window.createOrUpdateUser = jest.fn();
    window.signOut = jest.fn();
    window.getUserByPhone = jest.fn();
    window.updateAuthUI = jest.fn();
    
    // Evaluate the IIFE to attach PhoneAuth to window
    eval(phoneAuthJs);
  });

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Session Management', () => {
    it('should return false for isLoggedIn when no session exists', () => {
      expect(window.PhoneAuth.isLoggedIn()).toBe(false);
      expect(window.PhoneAuth.getUser()).toBeNull();
    });

    it('should handle requireAuth correctly', () => {
      window.navigate = jest.fn();
      
      expect(window.PhoneAuth.requireAuth('#login')).toBe(false);
      expect(window.navigate).toHaveBeenCalledWith('#login');
    });
  });

  describe('Authentication flow', () => {
    it('should hash passwords consistently', async () => {
      const hash1 = await window.PhoneAuth.hashPassword('mypassword');
      const hash2 = await window.PhoneAuth.hashPassword('mypassword');
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should register a new user successfully', async () => {
      window.signUp.mockResolvedValueOnce({ user: { uid: 'user_123' } });
      window.createOrUpdateUser.mockResolvedValueOnce(true);

      const userData = await window.PhoneAuth.register('1234567890', 'Test User', 'password123');
      
      expect(window.signUp).toHaveBeenCalledWith('1234567890@padmanabh.site', 'password123');
      expect(window.createOrUpdateUser).toHaveBeenCalled();
      expect(userData.phone).toBe('1234567890');
      expect(userData.uid).toBe('user_123');
      expect(window.PhoneAuth.isLoggedIn()).toBe(true);
    });

    it('should login an existing user', async () => {
      const mockHash = await window.PhoneAuth.hashPassword('password123');
      
      // Mock Firestore returning a user with matching passwordHash
      window.getUserByPhone.mockResolvedValueOnce({
        phone: '1234567890',
        uid: 'user_123',
        passwordHash: mockHash
      });
      window.createOrUpdateUser.mockResolvedValueOnce(true);

      const userData = await window.PhoneAuth.login('1234567890', 'password123');
      
      expect(window.getUserByPhone).toHaveBeenCalledWith('1234567890');
      expect(window.signIn).not.toHaveBeenCalled(); // Should not call Firebase if hash matches
      expect(userData.uid).toBe('user_123');
      expect(window.PhoneAuth.isLoggedIn()).toBe(true);
    });

    it('should reject login with wrong password', async () => {
      const wrongHash = 'some_other_hash';
      
      window.getUserByPhone.mockResolvedValueOnce({
        phone: '1234567890',
        uid: 'user_123',
        passwordHash: wrongHash
      });

      await expect(window.PhoneAuth.login('1234567890', 'password123')).rejects.toThrow('Invalid phone number or password.');
    });

    it('should logout user and clear session', async () => {
      window.signUp.mockResolvedValueOnce({ user: { uid: 'user_123' } });
      await window.PhoneAuth.register('1234567890', 'Test User', 'password123');
      expect(window.PhoneAuth.isLoggedIn()).toBe(true);

      await window.PhoneAuth.logout();
      expect(window.signOut).toHaveBeenCalled();
      expect(window.PhoneAuth.isLoggedIn()).toBe(false);
      expect(window.PhoneAuth.getUser()).toBeNull();
    });
  });
});
