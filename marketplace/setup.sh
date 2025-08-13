#!/bin/bash

echo "🚀 Setting up Marketplace Application..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install --force

# Install server dependencies
echo "📦 Installing server dependencies..."
cd packages/server
npm install --force
cd ../..

# Install web dependencies
echo "📦 Installing web dependencies..."
cd packages/web
npm install --force
cd ../..

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Backend: cd packages/server && npm run dev"
echo "2. Frontend: cd packages/web && npm run dev"
