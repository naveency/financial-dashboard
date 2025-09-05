# Environment Configuration

This document explains how to configure environment variables for the Financial Dashboard frontend application.

## Environment Files

### `.env.local` (Local Development)
- Used for local development
- Ignored by Git (contains sensitive/local-specific values)
- Create this file by copying `.env.example`

### `.env.example` (Template)
- Template file showing all available environment variables
- Committed to Git as documentation
- Copy this to `.env.local` and update values

### `.env.production` (Production)
- Contains production-specific defaults
- Can be committed to Git (no sensitive values)
- Used when `NODE_ENV=production`

## Required Variables

### `NEXT_PUBLIC_API_BASE_URL`
The base URL for your financial dashboard API backend.

**Examples:**
- Development: `http://127.0.0.1:8080`
- Staging: `https://api-staging.yourdomain.com`
- Production: `https://api.yourdomain.com`

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser and should not contain sensitive information.

## Setup Instructions

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Update the values in `.env.local`:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Validation

The application will validate that required environment variables are set and throw an error if they're missing.

## Security Notes

- Never commit `.env.local` or files containing sensitive information
- Use `NEXT_PUBLIC_` prefix only for variables safe to expose to browsers
- Server-side environment variables (without `NEXT_PUBLIC_`) are not exposed to the browser