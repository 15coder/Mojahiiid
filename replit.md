# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the "مجاهد للتجارة" (Mujahid Trade) inventory management mobile app built with Expo/React Native.

## Stack

- **Monorepo tool**: pnpm workspaces (v10.26.1)
- **Node.js version**: 22.14.0
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile framework**: Expo (v54) + React Native + expo-router
- **UI**: RTL Arabic interface, Tajawal font, dark/light mode

## Artifacts

### `artifacts/mujahid` — مجاهد للتجارة (Mujahid Trade)
- **Type**: Expo mobile app
- **Preview path**: `/`
- **Slug**: `mujahid`
- **Bundle ID**: `com.needaa.mujahid`
- **Features**:
  - Product inventory management (CRUD)
  - Dual-currency pricing (SYP / USD) with live conversion
  - Barcode scanner (expo-camera)
  - Product images (expo-image-picker)
  - Biometric lock (expo-local-authentication)
  - Fuzzy search (fuse.js)
  - Price trend tracking
  - JSON backup/restore
  - RTL Arabic UI with Tajawal font
  - Dark/light mode support
  - AsyncStorage persistence

## EAS Build (expo.dev)

`artifacts/mujahid/eas.json` — configured for EAS builds:
- pnpm version: `10.26.1` (must be full semver)
- node version: `22.14.0`
- Profiles: `development` (APK), `preview` (APK), `production` (AAB)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
