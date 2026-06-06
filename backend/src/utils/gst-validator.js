/**
 * Indian GSTIN Validation Utility
 * Validates GSTIN format and checksum
 */

const logger = require('./logger');

/**
 * Validate GSTIN format and checksum
 * @param {string} gstin - GSTIN to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validateGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== 'string') {
    return false;
  }

  // Remove spaces and convert to uppercase
  const cleanGSTIN = gstin.replace(/\s+/g, '').toUpperCase();

  // Check length
  if (cleanGSTIN.length !== 15) {
    return false;
  }

  // Check format using regex
  // Format: 2 digits + 10 alphanumeric + 1 digit + 1 alphabet + 1 alphanumeric
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(cleanGSTIN)) {
    return false;
  }

  // Validate state code (first 2 digits)
  const stateCode = parseInt(cleanGSTIN.substring(0, 2));
  if (stateCode < 1 || stateCode > 37) {
    return false;
  }

  // Validate checksum
  return validateGSTINChecksum(cleanGSTIN);
};

/**
 * Validate GSTIN checksum using Luhn algorithm variation
 * @param {string} gstin - Clean GSTIN (15 characters)
 * @returns {boolean} True if checksum is valid
 */
const validateGSTINChecksum = (gstin) => {
  try {
    const codeList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let factor = 2;
    let sum = 0;
    let checkCodePoint = 0;

    // Process first 14 characters
    for (let i = 0; i < 14; i++) {
      let codePoint = -1;
      for (let j = 0; j < codeList.length; j++) {
        if (codeList[j] === gstin[i]) {
          codePoint = j;
          break;
        }
      }
      
      if (codePoint === -1) {
        return false; // Invalid character
      }

      let digit = factor * codePoint;
      factor = (factor === 2) ? 1 : 2;
      digit = Math.floor(digit / 36) + (digit % 36);
      sum += digit;
    }

    // Calculate check digit
    checkCodePoint = (36 - (sum % 36)) % 36;
    
    // Compare with actual check digit (15th character)
    return gstin[14] === codeList[checkCodePoint];

  } catch (error) {
    logger.error('Error validating GSTIN checksum:', error);
    return false;
  }
};

/**
 * Extract information from GSTIN
 * @param {string} gstin - Valid GSTIN
 * @returns {Object} Extracted information
 */
const extractGSTINInfo = (gstin) => {
  if (!validateGSTIN(gstin)) {
    return null;
  }

  const cleanGSTIN = gstin.replace(/\s+/g, '').toUpperCase();
  
  // State codes mapping
  const stateCodes = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman and Diu',
    '26': 'Dadra and Nagar Haveli',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh'
  };

  const stateCode = cleanGSTIN.substring(0, 2);
  const pan = cleanGSTIN.substring(2, 12);
  const entityNumber = cleanGSTIN.substring(12, 13);
  const defaultCode = cleanGSTIN.substring(13, 14);
  const checkDigit = cleanGSTIN.substring(14, 15);

  return {
    gstin: cleanGSTIN,
    stateCode: stateCode,
    stateName: stateCodes[stateCode] || 'Unknown State',
    pan: pan,
    entityNumber: entityNumber,
    defaultCode: defaultCode,
    checkDigit: checkDigit,
    isValid: true
  };
};

/**
 * Format GSTIN with spaces for better readability
 * @param {string} gstin - GSTIN to format
 * @returns {string} Formatted GSTIN
 */
const formatGSTIN = (gstin) => {
  if (!gstin) return '';
  
  const cleanGSTIN = gstin.replace(/\s+/g, '').toUpperCase();
  
  if (cleanGSTIN.length !== 15) {
    return gstin; // Return original if invalid length
  }

  // Format as: XX XXXXX XXXX X X X
  return `${cleanGSTIN.substring(0, 2)} ${cleanGSTIN.substring(2, 7)} ${cleanGSTIN.substring(7, 11)} ${cleanGSTIN.substring(11, 12)} ${cleanGSTIN.substring(12, 13)} ${cleanGSTIN.substring(13, 15)}`;
};

/**
 * Check if GSTIN belongs to a specific state
 * @param {string} gstin - GSTIN to check
 * @param {string} stateCode - 2-digit state code to match
 * @returns {boolean} True if GSTIN belongs to the state
 */
const isGSTINFromState = (gstin, stateCode) => {
  if (!validateGSTIN(gstin) || !stateCode) {
    return false;
  }

  const cleanGSTIN = gstin.replace(/\s+/g, '').toUpperCase();
  const gstinStateCode = cleanGSTIN.substring(0, 2);
  
  return gstinStateCode === stateCode.padStart(2, '0');
};

/**
 * Generate random valid GSTIN for testing purposes
 * @param {string} stateCode - 2-digit state code (optional)
 * @returns {string} Valid GSTIN
 */
const generateTestGSTIN = (stateCode = '27') => {
  // This is for testing only - do not use in production
  const codeList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Generate first 14 characters
  let gstin = stateCode.padStart(2, '0');
  
  // Add 5 random letters for PAN part
  for (let i = 0; i < 5; i++) {
    gstin += codeList[10 + Math.floor(Math.random() * 26)]; // A-Z only
  }
  
  // Add 4 random digits
  for (let i = 0; i < 4; i++) {
    gstin += Math.floor(Math.random() * 10);
  }
  
  // Add entity number (1-9 or A-Z, excluding 0)
  gstin += codeList[1 + Math.floor(Math.random() * 35)];
  
  // Calculate and add check digit
  let factor = 2;
  let sum = 0;
  
  for (let i = 0; i < 14; i++) {
    let codePoint = codeList.indexOf(gstin[i]);
    let digit = factor * codePoint;
    factor = (factor === 2) ? 1 : 2;
    digit = Math.floor(digit / 36) + (digit % 36);
    sum += digit;
  }
  
  const checkCodePoint = (36 - (sum % 36)) % 36;
  gstin += codeList[checkCodePoint];
  
  return gstin;
};

/**
 * Validate multiple GSTINs in batch
 * @param {string[]} gstins - Array of GSTINs to validate
 * @returns {Object[]} Array of validation results
 */
const validateGSTINBatch = (gstins) => {
  if (!Array.isArray(gstins)) {
    return [];
  }

  return gstins.map(gstin => ({
    gstin: gstin,
    isValid: validateGSTIN(gstin),
    info: validateGSTIN(gstin) ? extractGSTINInfo(gstin) : null
  }));
};

module.exports = {
  validateGSTIN,
  validateGSTINChecksum,
  extractGSTINInfo,
  formatGSTIN,
  isGSTINFromState,
  generateTestGSTIN,
  validateGSTINBatch
};