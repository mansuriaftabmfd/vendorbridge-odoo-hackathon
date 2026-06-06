/**
 * Atomic Number Generation Utility
 * Generates sequential numbers for PO, RFQ, Invoice, and Quotation
 */

const { query } = require('../config/database');
const logger = require('./logger');

/**
 * Generate next sequential number for a given type
 * @param {string} type - Type: 'po', 'rfq', 'invoice', 'quotation'
 * @param {string} format - Format: 'PO-YYYY-XXXX', 'RFQ-YYYY-XXXX', etc.
 * @returns {Promise<string>} Generated number
 */
const generateNumber = async (type, format = null) => {
  const currentYear = new Date().getFullYear();
  
  // Default formats
  const formats = {
    po: 'PO-YYYY-XXXX',
    rfq: 'RFQ-YYYY-XXXX',
    invoice: 'INV-YYYY-XXXX',
    quotation: 'QTN-YYYY-XXXX'
  };
  
  const numberFormat = format || formats[type];
  if (!numberFormat) {
    throw new Error(`Invalid number type: ${type}`);
  }

  try {
    // Table names for each type
    const tables = {
      po: 'po_counters',
      rfq: 'rfq_counters',
      invoice: 'invoice_counters',
      quotation: 'quotation_counters'
    };

    const tableName = tables[type];
    if (!tableName) {
      throw new Error(`Invalid number type: ${type}`);
    }

    // Get next number atomically using UPSERT
    const result = await query(`
      INSERT INTO ${tableName} (year, last_number)
      VALUES ($1, 1)
      ON CONFLICT (year)
      DO UPDATE SET last_number = ${tableName}.last_number + 1
      RETURNING last_number
    `, [currentYear]);

    const nextNumber = result.rows[0].last_number;
    
    // Format the number
    const formattedNumber = formatNumber(numberFormat, currentYear, nextNumber);
    
    logger.info(`Generated ${type.toUpperCase()} number: ${formattedNumber}`, {
      type,
      year: currentYear,
      sequence: nextNumber
    });
    
    return formattedNumber;

  } catch (error) {
    logger.error(`Failed to generate ${type} number:`, error);
    throw error;
  }
};

/**
 * Format number according to the specified pattern
 * @param {string} format - Format pattern (e.g., 'PO-YYYY-XXXX')
 * @param {number} year - Current year
 * @param {number} sequence - Sequence number
 * @returns {string} Formatted number
 */
const formatNumber = (format, year, sequence) => {
  return format
    .replace('YYYY', year.toString())
    .replace('XXXX', sequence.toString().padStart(4, '0'))
    .replace('XXX', sequence.toString().padStart(3, '0'))
    .replace('XX', sequence.toString().padStart(2, '0'));
};

/**
 * Generate Purchase Order Number
 * @returns {Promise<string>} PO number (e.g., 'PO-2024-0001')
 */
const generatePONumber = async () => {
  return await generateNumber('po');
};

/**
 * Generate RFQ Number
 * @returns {Promise<string>} RFQ number (e.g., 'RFQ-2024-0001')
 */
const generateRFQNumber = async () => {
  return await generateNumber('rfq');
};

/**
 * Generate Invoice Number
 * @returns {Promise<string>} Invoice number (e.g., 'INV-2024-0001')
 */
const generateInvoiceNumber = async () => {
  return await generateNumber('invoice');
};

/**
 * Generate Quotation Number
 * @returns {Promise<string>} Quotation number (e.g., 'QTN-2024-0001')
 */
const generateQuotationNumber = async () => {
  return await generateNumber('quotation');
};

/**
 * Get current counter value for a type
 * @param {string} type - Type: 'po', 'rfq', 'invoice', 'quotation'
 * @param {number} year - Year (optional, defaults to current year)
 * @returns {Promise<number>} Current counter value
 */
const getCurrentCounter = async (type, year = null) => {
  const currentYear = year || new Date().getFullYear();
  
  const tables = {
    po: 'po_counters',
    rfq: 'rfq_counters',
    invoice: 'invoice_counters',
    quotation: 'quotation_counters'
  };

  const tableName = tables[type];
  if (!tableName) {
    throw new Error(`Invalid number type: ${type}`);
  }

  try {
    const result = await query(`
      SELECT last_number FROM ${tableName} WHERE year = $1
    `, [currentYear]);

    return result.rows.length > 0 ? result.rows[0].last_number : 0;
  } catch (error) {
    logger.error(`Failed to get current counter for ${type}:`, error);
    throw error;
  }
};

/**
 * Reset counter for a specific year and type
 * @param {string} type - Type: 'po', 'rfq', 'invoice', 'quotation'
 * @param {number} year - Year to reset
 * @returns {Promise<boolean>} Success status
 */
const resetCounter = async (type, year) => {
  const tables = {
    po: 'po_counters',
    rfq: 'rfq_counters',
    invoice: 'invoice_counters',
    quotation: 'quotation_counters'
  };

  const tableName = tables[type];
  if (!tableName) {
    throw new Error(`Invalid number type: ${type}`);
  }

  try {
    await query(`
      UPDATE ${tableName} SET last_number = 0 WHERE year = $1
    `, [year]);

    logger.info(`Reset ${type.toUpperCase()} counter for year ${year}`);
    return true;
  } catch (error) {
    logger.error(`Failed to reset counter for ${type} year ${year}:`, error);
    throw error;
  }
};

/**
 * Initialize counters for a new year
 * @param {number} year - Year to initialize
 * @returns {Promise<boolean>} Success status
 */
const initializeCountersForYear = async (year) => {
  const types = ['po', 'rfq', 'invoice', 'quotation'];
  
  try {
    for (const type of types) {
      const tables = {
        po: 'po_counters',
        rfq: 'rfq_counters',
        invoice: 'invoice_counters',
        quotation: 'quotation_counters'
      };

      await query(`
        INSERT INTO ${tables[type]} (year, last_number)
        VALUES ($1, 0)
        ON CONFLICT (year) DO NOTHING
      `, [year]);
    }

    logger.info(`Initialized counters for year ${year}`);
    return true;
  } catch (error) {
    logger.error(`Failed to initialize counters for year ${year}:`, error);
    throw error;
  }
};

/**
 * Get statistics for all counters
 * @returns {Promise<Object>} Counter statistics
 */
const getCounterStats = async () => {
  try {
    const stats = {};
    const types = ['po', 'rfq', 'invoice', 'quotation'];
    
    for (const type of types) {
      const tables = {
        po: 'po_counters',
        rfq: 'rfq_counters',
        invoice: 'invoice_counters',
        quotation: 'quotation_counters'
      };

      const result = await query(`
        SELECT year, last_number 
        FROM ${tables[type]} 
        ORDER BY year DESC
        LIMIT 5
      `);

      stats[type] = result.rows;
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get counter statistics:', error);
    throw error;
  }
};

module.exports = {
  generateNumber,
  generatePONumber,
  generateRFQNumber,
  generateInvoiceNumber,
  generateQuotationNumber,
  getCurrentCounter,
  resetCounter,
  initializeCountersForYear,
  getCounterStats,
  formatNumber
};