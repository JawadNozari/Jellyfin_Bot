# Jellefin Bot

A Telegram bot built with GrammY, TypeScript, and Bun.

## Features

- Authentication middleware for admin commands
- Session management
- Logging middleware
- Basic command handling

## Setup

1. Install dependencies:
```bash
bun install
```

2. Create a `.env` file in the root directory with the following variables:
```
BOT_TOKEN=your_bot_token_here
ADMIN_USERNAME=your_admin_username
```

3. Start the bot:
```bash
bun run dev
```

## Available Commands

- `/start` - Start the bot
- `/help` - Show available commands
- `/count` - Show message counter
- `/admin` - Admin only command

## Development

The bot uses:
- GrammY for Telegram Bot API
- TypeScript for type safety
- Bun as the runtime
- Dotenv for environment variables 