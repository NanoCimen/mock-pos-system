# Mock POS System - Setup Guide

## Project Structure
- `backend/` - Express + PostgreSQL + TypeScript API
- `admin-panel/` - React + TypeScript + Vite Admin UI

## Backend Setup

1. **Create Database:**
   ```bash
   createdb mock_pos_db
   ```

2. **Create `.env` file in `backend/` directory:**
   ```env
   DATABASE_URL=postgresql://localhost:5432/mock_pos_db
   PORT=3001
   ```

3. **Install dependencies (if needed):**
   ```bash
   cd backend
   npm install
   ```

4. **Initialize database:**
   ```bash
   npm run db:init
   ```

5. **Seed database:**
   ```bash
   npm run db:seed
   ```

6. **Start backend server:**
   ```bash
   npm run dev
   ```

   Backend will run on http://localhost:3001

## Admin Panel Setup

1. **Install dependencies (if needed):**
   ```bash
   cd admin-panel
   npm install
   ```

2. **Start admin panel:**
   ```bash
   npm run dev
   ```

   Admin panel will run on http://localhost:3002

## Quick Start

1. Start backend: `cd backend && npm run dev`
2. Start admin panel: `cd admin-panel && npm run dev`
3. Open http://localhost:3002 in your browser

## Features

- ✅ Menu management (CRUD)
- ✅ Table management (CRUD)
- ✅ Bill viewing and details
- ✅ Restaurant settings
- ✅ Full REST API with PostgreSQL
