/**
 * Convert suiprivkey format to base64 encoded raw secret key
 * Usage: node scripts/convert-suiprivkey-to-base64.js <suiprivkey>
 */

const bech32 = require('bech32');

function convertSuiprivkeyToBase64(suiprivkey) {
  try {
    // Decode bech32
    const decoded = bech32.decode(suiprivkey);
    const words = decoded.words;

    // Convert from 5-bit words to 8-bit bytes
    const bytes = bech32.convert(words, 5, 8, false);

    // The first 32 bytes are the secret key
    const secretKey = Buffer.from(bytes.slice(0, 32));

    // Convert to base64
    const base64 = secretKey.toString('base64');

    return base64;
  } catch (error) {
    console.error('Error converting key:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const suiprivkey = process.argv[2];
  if (!suiprivkey) {
    console.error('Usage: node convert-suiprivkey-to-base64.js <suiprivkey>');
    process.exit(1);
  }

  try {
    const base64 = convertSuiprivkeyToBase64(suiprivkey);
    console.log('Base64 secret key:', base64);
    console.log('\nAdd this to your .env.local:');
    console.log(`SUI_ADMIN_PRIVATE_KEY=${base64}`);
  } catch (error) {
    console.error('Failed to convert:', error.message);
    process.exit(1);
  }
}

module.exports = { convertSuiprivkeyToBase64 };
