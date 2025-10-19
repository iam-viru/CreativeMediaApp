require('dotenv').config();

module.exports = {
  API_HEADERS: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Subscription-Key': process.env.SUBSCRIPTION_KEY
  },
  BASE_API_URL: 'https://raw.githubusercontent.com/freelancerking/net32/refs/heads/main'
};
