const fs = require('fs');
const path = require('path');

console.log('🔧 OneBox Email Aggregator Setup');
console.log('================================');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found. Creating from .env.example...');
  
  const examplePath = path.join(__dirname, '..', '.env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('✅ .env file created. Please update with your actual values.');
  } else {
    console.log('❌ .env.example not found. Please create .env manually.');
  }
} else {
  console.log('✅ .env file exists');
}

// Load environment variables
require('dotenv').config();

// Check critical environment variables
const requiredVars = ['MONGODB_URI'];
const optionalVars = ['GMAIL_USER', 'OPENAI_API_KEY', 'JWT_SECRET'];

console.log('\n📋 Environment Variables Check:');
console.log('==============================');

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Configured`);
  } else {
    console.log(`❌ ${varName}: Missing (REQUIRED)`);
  }
});

optionalVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Configured`);
  } else {
    console.log(`⚠️  ${varName}: Not configured (Optional)`);
  }
});

console.log('\n🚀 Setup complete!');
console.log('Run "npm start" to start the server.');
