const puppeteer = require('puppeteer');

(async () => {
  console.log('=== STARTING PHONE AUTH & PASSWORD HASHING VERIFICATION ===');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });

  page.on('pageerror', err => {
    console.error('BROWSER PAGE ERROR:', err.message);
  });

  // Navigate to local server homepage where app.js and phone-auth.js are loaded
  await page.goto('http://127.0.0.1:8080/index.html', { waitUntil: 'networkidle2' });

  // 1. Verify SHA-256 Hashing helper
  console.log('\n1. Verifying SHA-256 Hashing Helper...');
  const hashingSuccess = await page.evaluate(async () => {
    if (typeof PhoneAuth === 'undefined') {
      console.error('PhoneAuth is not loaded!');
      return false;
    }
    if (typeof PhoneAuth.hashPassword !== 'function') {
      console.error('PhoneAuth.hashPassword is not a function!');
      return false;
    }
    
    // Hash of 'testpassword123'
    const hash = await PhoneAuth.hashPassword('testpassword123');
    const expected = 'b55c8792d1ce458e279308835f8a97b580263503e76e1998e279703e35ad0c2e';
    
    if (hash === expected) {
      console.log('SHA-256 hashing matches perfectly:', hash);
      return true;
    } else {
      console.error(`SHA-256 hashing failed! Got: ${hash}, Expected: ${expected}`);
      return false;
    }
  });

  if (!hashingSuccess) {
    console.error('Verification failed at Step 1.');
    await browser.close();
    process.exit(1);
  }

  // 2. Verify Registration and Password Hash Storage
  console.log('\n2. Verifying User Registration and Hashed Password storage...');
  const registrationSuccess = await page.evaluate(async () => {
    try {
      // Clear previous local storage auth values first
      localStorage.removeItem('pa_local_auth');
      localStorage.removeItem('pa_users');
      localStorage.removeItem('pa_user_session');

      console.log('Registering user...');
      const phone = '9999999901';
      const name = 'Verification Test User';
      const pass = 'securePassword123';

      const user = await PhoneAuth.register(phone, name, pass);
      console.log('Registration call completed. Result:', JSON.stringify(user));

      const registeredUser = user;
      
      if (!registeredUser) {
        console.error('Registration returned null or undefined!');
        return false;
      }

      if (!registeredUser.passwordHash) {
        console.error('User payload returned but passwordHash field is missing!');
        return false;
      }

      const expectedHash = await PhoneAuth.hashPassword(pass);
      if (registeredUser.passwordHash !== expectedHash) {
        console.error(`passwordHash mismatch! Got: ${registeredUser.passwordHash}, Expected: ${expectedHash}`);
        return false;
      }

      console.log('User registered and passwordHash verified successfully!');
      return true;
    } catch (e) {
      console.error('Registration test threw an error:', e.message);
      return false;
    }
  });

  if (!registrationSuccess) {
    console.error('Verification failed at Step 2.');
    await browser.close();
    process.exit(1);
  }

  // 3. Verify Login Validation & Error Handling
  console.log('\n3. Verifying Login validation and password overrides...');
  const loginSuccess = await page.evaluate(async () => {
    try {
      const phone = '9999999901';
      const correctPass = 'securePassword123';
      const wrongPass = 'wrongPassword123';

      console.log('Logging out first...');
      await PhoneAuth.logout();
      if (PhoneAuth.isLoggedIn()) {
        console.error('Logout failed! Still logged in.');
        return false;
      }

      console.log('Attempting login with WRONG password...');
      try {
        await PhoneAuth.login(phone, wrongPass);
        console.error('Login succeeded when it should have failed!');
        return false;
      } catch (err) {
        console.log('Login failed as expected for incorrect password:', err.message);
      }

      console.log('Attempting login with CORRECT password...');
      const user = await PhoneAuth.login(phone, correctPass);
      
      if (!PhoneAuth.isLoggedIn()) {
        console.error('Login with correct password succeeded but session status says not logged in!');
        return false;
      }

      console.log('Logged in successfully! User session:', JSON.stringify(PhoneAuth.getUser()));
      return true;
    } catch (e) {
      console.error('Login test threw an error:', e.message);
      return false;
    }
  });

  if (!loginSuccess) {
    console.error('Verification failed at Step 3.');
    await browser.close();
    process.exit(1);
  }

  console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
  await browser.close();
})();
