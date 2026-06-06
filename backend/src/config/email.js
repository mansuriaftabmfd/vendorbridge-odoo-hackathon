/**
 * Email Configuration
 * Using Nodemailer with SMTP transport
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// SMTP configuration
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 10 // Max 10 messages per second
};

// Create transporter
let transporter = null;

const createTransporter = () => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP credentials not configured - email functionality disabled');
      return null;
    }

    const t = nodemailer.createTransport(smtpConfig);

    // Verify asynchronously - NEVER crash the server on SMTP failure
    Promise.resolve()
      .then(() => t.verify())
      .then(() => {
        logger.info('SMTP server ready for messages');
      })
      .catch((error) => {
        logger.warn('SMTP not available (email sending disabled): ' + error.message);
        transporter = null;
      });

    return t;
  } catch (error) {
    logger.error('Failed to create email transporter:', error);
    return null;
  }
};

// Initialize transporter
transporter = createTransporter();

// Email templates configuration
const emailConfig = {
  from: {
    name: 'VendorBridge ERP',
    address: process.env.SMTP_USER
  },
  templates: {
    welcome: {
      subject: 'Welcome to VendorBridge ERP',
      template: 'welcome'
    },
    rfqInvitation: {
      subject: 'New RFQ Invitation',
      template: 'rfq-invitation'
    },
    quotationSubmitted: {
      subject: 'Quotation Submitted Successfully',
      template: 'quotation-submitted'
    },
    approvalRequired: {
      subject: 'Approval Required - {{quotationNumber}}',
      template: 'approval-required'
    },
    approvalDecision: {
      subject: 'Approval Decision - {{quotationNumber}}',
      template: 'approval-decision'
    },
    poGenerated: {
      subject: 'Purchase Order Generated - {{poNumber}}',
      template: 'po-generated'
    },
    invoiceGenerated: {
      subject: 'Invoice Generated - {{invoiceNumber}}',
      template: 'invoice-generated'
    },
    passwordReset: {
      subject: 'Password Reset Request',
      template: 'password-reset'
    },
    emailVerification: {
      subject: 'Verify Your Email Address',
      template: 'email-verification'
    }
  }
};

// Send email function
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      logger.warn('Email transporter not available - skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    const mailOptions = {
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments || []
    };

    // Add CC and BCC if provided
    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;

    logger.info(`Sending email to: ${options.to} with subject: ${options.subject}`);
    
    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent successfully:`, {
      messageId: result.messageId,
      to: options.to,
      subject: options.subject
    });

    return {
      success: true,
      messageId: result.messageId,
      response: result.response
    };

  } catch (error) {
    logger.error('Failed to send email:', {
      to: options.to,
      subject: options.subject,
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
};

// Send bulk email function
const sendBulkEmail = async (recipients, options) => {
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const emailOptions = {
        ...options,
        to: recipient.email
      };

      // Replace placeholders in subject and content
      if (recipient.data) {
        emailOptions.subject = replaceTemplateVariables(options.subject, recipient.data);
        emailOptions.html = replaceTemplateVariables(options.html, recipient.data);
        if (options.text) {
          emailOptions.text = replaceTemplateVariables(options.text, recipient.data);
        }
      }

      const result = await sendEmail(emailOptions);
      results.push({
        email: recipient.email,
        ...result
      });

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      results.push({
        email: recipient.email,
        success: false,
        error: error.message
      });
    }
  }

  return results;
};

// Template variable replacement
const replaceTemplateVariables = (template, data) => {
  if (!template || !data) return template;
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    await transporter.verify();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Close email transporter
const closeTransporter = () => {
  if (transporter) {
    transporter.close();
    logger.info('Email transporter closed');
  }
};

// Graceful shutdown
process.on('SIGINT', closeTransporter);
process.on('SIGTERM', closeTransporter);

module.exports = {
  transporter,
  emailConfig,
  sendEmail,
  sendBulkEmail,
  testEmailConfig,
  closeTransporter
};