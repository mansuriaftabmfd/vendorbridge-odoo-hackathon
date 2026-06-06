/**
 * Password Strength Validation Utility
 * Validates password strength according to security requirements
 */

const logger = require('./logger');

/**
 * Password strength requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,
  maxConsecutiveChars: 3,
  maxRepeatingChars: 3
};

/**
 * Special characters allowed in passwords
 */
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?~';

/**
 * Common weak passwords to reject
 */
const COMMON_WEAK_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty',
  'abc123', 'password1', 'admin', 'administrator', 'root',
  'user', 'guest', 'test', 'demo', 'welcome', 'login',
  '12345678', 'password!', 'Password123', 'Admin123'
];

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with score and messages
 */
const validatePasswordStrength = (password) => {
  const result = {
    isValid: false,
    score: 0,
    strength: 'Very Weak',
    messages: [],
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      digit: false,
      specialChar: false,
      notCommon: false,
      noConsecutive: false,
      noRepeating: false
    }
  };

  if (!password || typeof password !== 'string') {
    result.messages.push('Password is required');
    return result;
  }

  // Check length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    result.messages.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  } else if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    result.messages.push(`Password must be no more than ${PASSWORD_REQUIREMENTS.maxLength} characters long`);
  } else {
    result.requirements.length = true;
    result.score += 10;
  }

  // Check uppercase letters
  if (PASSWORD_REQUIREMENTS.requireUppercase) {
    if (!/[A-Z]/.test(password)) {
      result.messages.push('Password must contain at least one uppercase letter');
    } else {
      result.requirements.uppercase = true;
      result.score += 10;
    }
  }

  // Check lowercase letters
  if (PASSWORD_REQUIREMENTS.requireLowercase) {
    if (!/[a-z]/.test(password)) {
      result.messages.push('Password must contain at least one lowercase letter');
    } else {
      result.requirements.lowercase = true;
      result.score += 10;
    }
  }

  // Check digits
  if (PASSWORD_REQUIREMENTS.requireDigit) {
    if (!/\d/.test(password)) {
      result.messages.push('Password must contain at least one digit');
    } else {
      result.requirements.digit = true;
      result.score += 10;
    }
  }

  // Check special characters
  if (PASSWORD_REQUIREMENTS.requireSpecialChar) {
    const hasSpecialChar = SPECIAL_CHARS.split('').some(char => password.includes(char));
    if (!hasSpecialChar) {
      result.messages.push(`Password must contain at least one special character: ${SPECIAL_CHARS}`);
    } else {
      result.requirements.specialChar = true;
      result.score += 10;
    }
  }

  // Check for common weak passwords
  const lowerPassword = password.toLowerCase();
  const isCommon = COMMON_WEAK_PASSWORDS.some(weak => 
    lowerPassword === weak.toLowerCase() || lowerPassword.includes(weak.toLowerCase())
  );
  
  if (isCommon) {
    result.messages.push('Password is too common and easily guessable');
    result.score -= 20;
  } else {
    result.requirements.notCommon = true;
    result.score += 15;
  }

  // Check for consecutive characters
  const hasConsecutive = hasConsecutiveChars(password, PASSWORD_REQUIREMENTS.maxConsecutiveChars);
  if (hasConsecutive) {
    result.messages.push(`Password should not contain more than ${PASSWORD_REQUIREMENTS.maxConsecutiveChars} consecutive identical characters`);
    result.score -= 10;
  } else {
    result.requirements.noConsecutive = true;
    result.score += 5;
  }

  // Check for repeating patterns
  const hasRepeating = hasRepeatingChars(password, PASSWORD_REQUIREMENTS.maxRepeatingChars);
  if (hasRepeating) {
    result.messages.push(`Password should not have repeating character patterns`);
    result.score -= 10;
  } else {
    result.requirements.noRepeating = true;
    result.score += 5;
  }

  // Additional complexity checks
  if (password.length >= 12) {
    result.score += 10; // Bonus for longer passwords
  }

  if (hasMultipleCharSets(password)) {
    result.score += 10; // Bonus for character diversity
  }

  if (!hasSequentialChars(password)) {
    result.score += 5; // Bonus for no sequential chars (abc, 123)
  }

  // Normalize score
  result.score = Math.max(0, Math.min(100, result.score));

  // Determine strength level
  if (result.score >= 80) {
    result.strength = 'Very Strong';
  } else if (result.score >= 60) {
    result.strength = 'Strong';
  } else if (result.score >= 40) {
    result.strength = 'Moderate';
  } else if (result.score >= 20) {
    result.strength = 'Weak';
  } else {
    result.strength = 'Very Weak';
  }

  // Password is valid if it meets all basic requirements
  result.isValid = result.requirements.length && 
                  result.requirements.uppercase && 
                  result.requirements.lowercase && 
                  result.requirements.digit && 
                  result.requirements.specialChar && 
                  result.requirements.notCommon &&
                  result.score >= 50;

  return result;
};

/**
 * Check for consecutive identical characters
 * @param {string} password - Password to check
 * @param {number} maxConsecutive - Maximum allowed consecutive chars
 * @returns {boolean} True if has too many consecutive chars
 */
const hasConsecutiveChars = (password, maxConsecutive) => {
  let count = 1;
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      count++;
      if (count > maxConsecutive) {
        return true;
      }
    } else {
      count = 1;
    }
  }
  return false;
};

/**
 * Check for repeating character patterns
 * @param {string} password - Password to check
 * @param {number} maxRepeating - Maximum allowed repeating chars
 * @returns {boolean} True if has too many repeating patterns
 */
const hasRepeatingChars = (password, maxRepeating) => {
  const charCount = {};
  for (const char of password) {
    charCount[char] = (charCount[char] || 0) + 1;
    if (charCount[char] > maxRepeating) {
      return true;
    }
  }
  return false;
};

/**
 * Check if password uses multiple character sets
 * @param {string} password - Password to check
 * @returns {boolean} True if uses multiple character sets
 */
const hasMultipleCharSets = (password) => {
  const sets = [
    /[a-z]/, // lowercase
    /[A-Z]/, // uppercase
    /\d/,    // digits
    new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`) // special chars
  ];

  return sets.filter(regex => regex.test(password)).length >= 3;
};

/**
 * Check for sequential characters (abc, 123, qwe)
 * @param {string} password - Password to check
 * @returns {boolean} True if has sequential characters
 */
const hasSequentialChars = (password) => {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
    '0123456789'
  ];

  const lowerPassword = password.toLowerCase();

  for (const sequence of sequences) {
    for (let i = 0; i <= sequence.length - 3; i++) {
      const subseq = sequence.substring(i, i + 3);
      const reverseSubseq = subseq.split('').reverse().join('');
      
      if (lowerPassword.includes(subseq) || lowerPassword.includes(reverseSubseq)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Generate password suggestions
 * @returns {string[]} Array of password suggestions
 */
const generatePasswordSuggestions = () => {
  return [
    'Use a mix of uppercase and lowercase letters',
    'Include at least one number',
    'Add special characters like !@#$%^&*',
    'Make it at least 8 characters long',
    'Avoid common words and patterns',
    'Consider using a passphrase with special characters',
    'Use a password manager to generate strong passwords',
    'Avoid personal information like names or dates'
  ];
};

/**
 * Check if password has been breached (basic dictionary check)
 * @param {string} password - Password to check
 * @returns {boolean} True if password is known to be compromised
 */
const isPasswordBreached = (password) => {
  // In a real implementation, this would check against a database
  // of known breached passwords (like HaveIBeenPwned API)
  const commonBreached = [
    'password', '123456', '123456789', 'qwerty', 'password123',
    'admin', '12345678', '1234567890', 'welcome', 'monkey'
  ];

  return commonBreached.includes(password.toLowerCase());
};

/**
 * Estimate time to crack password
 * @param {string} password - Password to analyze
 * @returns {string} Estimated time to crack
 */
const estimateCrackTime = (password) => {
  let charsetSize = 0;
  
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/\d/.test(password)) charsetSize += 10;
  if (new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
    charsetSize += SPECIAL_CHARS.length;
  }

  const combinations = Math.pow(charsetSize, password.length);
  const guessesPerSecond = 1000000000; // 1 billion guesses per second
  const secondsToCrack = combinations / (2 * guessesPerSecond); // Average case

  if (secondsToCrack < 60) return 'Less than a minute';
  if (secondsToCrack < 3600) return `${Math.ceil(secondsToCrack / 60)} minutes`;
  if (secondsToCrack < 86400) return `${Math.ceil(secondsToCrack / 3600)} hours`;
  if (secondsToCrack < 31536000) return `${Math.ceil(secondsToCrack / 86400)} days`;
  if (secondsToCrack < 31536000000) return `${Math.ceil(secondsToCrack / 31536000)} years`;
  
  return 'Centuries';
};

module.exports = {
  validatePasswordStrength,
  generatePasswordSuggestions,
  isPasswordBreached,
  estimateCrackTime,
  PASSWORD_REQUIREMENTS,
  SPECIAL_CHARS
};