// debug-test.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const ACCOUNT_ID = '68de2bcfb23af023320642f8';

async function debugTest() {
  console.log('🔍 DEBUG TEST - Finding the Real Error');
  console.log('=====================================');

  try {
    console.log('\n1. Testing server connection...');
    console.log(`Trying to connect to: ${BASE_URL}`);

    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running and responding');
    console.log('Response:', healthResponse.data);

  } catch (error) {
    console.error('❌ SERVER CONNECTION FAILED:');
    console.error('Error details:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUTION: Your server is not running!');
      console.log('Run this command: node server.js');
      console.log('Then try the test again.');
      return;
    }

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }

    console.log('\nFull error object:');
    console.log(JSON.stringify(error, null, 2));
    return;
  }

  try {
    console.log('\n2. Testing email service endpoint...');
    const testResponse = await axios.get(`${BASE_URL}/api/emails/test`);
    console.log('✅ Email service is working');
    console.log('Response:', testResponse.data);

  } catch (error) {
    console.error('❌ EMAIL SERVICE FAILED:');
    console.error('URL tried:', `${BASE_URL}/api/emails/test`);
    console.error('Error:', error.message);

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response data:', error.response.data);
    }

    console.log('\n💡 This means there\'s an issue with:');
    console.log('- Your routes/emailroutes.js file');
    console.log('- Your services/emailService.js file'); 
    console.log('- Your database connection');
    console.log('- Missing dependencies');
  }
}

debugTest();