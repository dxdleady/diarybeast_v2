import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEncryptionKey, decryptContent } from '@/lib/encryption';
import {
  hybridDecrypt,
  isSealAvailable,
  createSessionKey,
  createSealAuthorizationTransaction,
} from '@/lib/seal';
import {
  createUserBurnTransaction,
  sponsorTransaction,
  getTokenConfig,
} from '@/lib/sui/sponsored-transactions';
import { getUserCoins, getUserTokenBalance } from '@/lib/sui/token';
import { getSuiClient } from '@/lib/sui/sponsored-transactions';
import { getAdminAddress } from '@/lib/sui/sponsored-transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

// Helper to get admin keypair (duplicated from sponsored-transactions.ts for server-side use)
function getAdminKeypair(): Ed25519Keypair | null {
  const privateKey = process.env.SUI_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }
  try {
    // Helper to decode bech32 suiprivkey format
    function decodeSuiprivkey(suiprivkey: string): Uint8Array {
      const bech32 = require('bech32');
      const decoded = bech32.bech32.decode(suiprivkey);
      const words = decoded.words;
      const bytes = bech32.bech32.fromWords(words);
      return new Uint8Array(bytes.slice(0, 32));
    }

    if (privateKey.startsWith('suiprivkey1')) {
      const secretKeyBytes = decodeSuiprivkey(privateKey);
      return Ed25519Keypair.fromSecretKey(secretKeyBytes);
    } else {
      return Ed25519Keypair.fromSecretKey(fromB64(privateKey));
    }
  } catch (error) {
    return null;
  }
}

const SUMMARY_COST = 50;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface PlutchikEmotions {
  joy: number;
  trust: number;
  fear: number;
  surprise: number;
  sadness: number;
  disgust: number;
  anger: number;
  anticipation: number;
}

interface AnalysisResult {
  emotions: PlutchikEmotions;
  summary: string;
  insights: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export async function POST(req: NextRequest) {
  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const { userAddress, weekStart, weekEnd, decryptedEntries } = requestBody;

    if (!userAddress || !weekStart || !weekEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If decryptedEntries are provided, use them directly (client-side decryption)
    // This allows Seal-encrypted entries to be decrypted on the client and sent to the server
    const useClientDecryptedEntries =
      Array.isArray(decryptedEntries) && decryptedEntries.length > 0;

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check balance
    if (user.coinsBalance < SUMMARY_COST) {
      return NextResponse.json(
        { error: 'Insufficient balance', required: SUMMARY_COST, current: user.coinsBalance },
        { status: 400 }
      );
    }

    // Check if summary already exists
    const existingSummary = await prisma.weeklySummary.findUnique({
      where: {
        userId_weekStart: {
          userId: user.id,
          weekStart: new Date(weekStart),
        },
      },
    });

    if (existingSummary) {
      return NextResponse.json({ error: 'Summary already exists for this week' }, { status: 400 });
    }

    // Get entries for the week
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekEnd);
    weekEndDate.setHours(23, 59, 59, 999);

    const entries = await prisma.entry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error: 'No entries found for this week',
          message: 'Please write some diary entries for this week before generating a summary.',
        },
        { status: 400 }
      );
    }

    // Decrypt entries
    let decryptedEntriesList: Array<{ date: string; content: string; wordCount: number }>;

    if (useClientDecryptedEntries) {
      // Use client-decrypted entries (for Seal-encrypted entries)
      decryptedEntriesList = decryptedEntries.map((decryptedEntry: any) => ({
        date: decryptedEntry.date,
        content: decryptedEntry.content,
        wordCount: decryptedEntry.wordCount || 0,
      }));
    } else {
      // Server-side decryption (for crypto-js encrypted entries or when client doesn't provide decrypted entries)
      // NOTE: Seal-encrypted entries are excluded from AI analysis
      // In the future: allow users to select which entries to include in analysis
      const encryptionKey = getEncryptionKey(userAddress);
      // Retrieve entries - some may be in Walrus, some in PostgreSQL
      const { retrieveEntry } = await import('@/lib/entries/walrus-storage');

      const decryptedEntriesResult = await Promise.all(
        entries.map(async (entry) => {
          let content: string;
          let decryptionError: string | null = null;

          // If entry is stored in Walrus, retrieve it
          if (entry.storageType === 'walrus' && entry.walrusBlobId) {
            try {
              const walrusEntry = await retrieveEntry(prisma, entry.id);
              if (walrusEntry) {
                // Check encryption method
                const encryptionMethod = walrusEntry.method || 'crypto-js';

                if (encryptionMethod === 'seal') {
                  // Seal-encrypted entries are excluded from AI analysis
                  // Users can choose to use Seal encryption for additional privacy
                  // In the future: allow users to select which entries to include in analysis
                  return null;

                  // FUTURE: Uncomment this code when we allow users to select which entries to include in AI analysis
                  // This code implements server-side Seal decryption for AI analysis
                  /*
                // Try to decrypt with Seal (requires server-side Seal configuration)
                if (isSealAvailable() && walrusEntry.sealEncryptedObject && walrusEntry.sealId) {
                  try {
                    // IMPORTANT: For server-side decryption with Seal, we need to:
                    // 1. Create SessionKey for userAddress (identity used for encryption)
                    // 2. Sign personal message - we'll use admin keypair since admin is authorized in access policy
                    // 3. Use SessionKey with signed personal message for decryption
                    
                    console.log('[summary/generate] Attempting Seal decryption for server-side AI analysis');
                    
                    // Import necessary modules
                    const { createSessionKey } = await import('@/lib/seal/session-key');
                    const { createSealAuthorizationTransaction } = await import('@/lib/seal/transaction');
                    const { hybridDecrypt } = await import('@/lib/seal/hybrid-encryption');
                    const { Ed25519Keypair } = await import('@mysten/sui.js/keypairs/ed25519');
                    const { fromB64 } = await import('@mysten/sui.js/utils');
                    const { decodeSuiprivkey } = await import('@/lib/sui/token');
                    
                    // Get admin keypair from environment
                    function getAdminKeypair(): Ed25519Keypair | null {
                      const privateKey = process.env.SUI_ADMIN_PRIVATE_KEY;
                      if (!privateKey) {
                        return null;
                      }
                      try {
                        if (privateKey.startsWith('suiprivkey1')) {
                          const secretKeyBytes = decodeSuiprivkey(privateKey);
                          return Ed25519Keypair.fromSecretKey(secretKeyBytes);
                        } else {
                          return Ed25519Keypair.fromSecretKey(fromB64(privateKey));
                        }
                      } catch (error) {
                        console.error('[summary/generate] Error getting admin keypair:', error);
                        return null;
                      }
                    }
                    
                    // Create SessionKey for userAddress (identity used for encryption)
                    const sessionKey = await createSessionKey(
                      userAddress,
                      undefined, // mvrName - optional
                      30, // ttlMin (30 minutes - max allowed by Seal SDK)
                      undefined // signer - we'll sign manually below
                    );
                    
                    console.log('[summary/generate] SessionKey created for userAddress:', userAddress);
                    
                    // Get personal message from SessionKey
                    const personalMessage = sessionKey.getPersonalMessage();
                    
                    // Sign personal message using admin keypair
                    // Note: This works because admin is authorized in the access policy
                    // The access policy allows admin to decrypt data for users
                    const adminKeypair = getAdminKeypair();
                    if (!adminKeypair) {
                      throw new Error('Admin keypair not available for signing personal message');
                    }
                    
                    console.log('[summary/generate] Signing personal message with admin keypair');
                    // Sign personal message using admin keypair
                    // IMPORTANT: The signature will be from admin address, but SessionKey is for userAddress
                    // This should work if the access policy allows admin to decrypt for users
                    const signatureResult = await adminKeypair.signPersonalMessage(personalMessage);
                    
                    // Set signature in SessionKey
                    // Note: This may fail validation if Seal SDK checks that signature matches SessionKey address
                    // But if access policy allows admin, this should work
                    try {
                      await sessionKey.setPersonalMessageSignature(signatureResult.signature);
                      console.log('[summary/generate] Personal message signature set in SessionKey');
                    } catch (signatureError: any) {
                      console.error('[summary/generate] Failed to set personal message signature:', signatureError);
                      // If setting signature fails, try to use sealKey for direct decryption (if available)
                      if (walrusEntry.sealKey) {
                        console.log('[summary/generate] Trying to use sealKey for direct decryption');
                        // TODO: Implement direct decryption using sealKey
                        // This requires understanding the structure of encryptedObject
                        throw new Error('Direct decryption with sealKey not yet implemented. Personal message signature validation failed.');
                      }
                      throw signatureError;
                    }
                    
                    // Create transaction bytes for seal_approve
                    // For server-side AI analysis, admin is the requester
                    const adminAddress = adminKeypair.toSuiAddress();
                    const txBytes = await createSealAuthorizationTransaction(userAddress, sessionKey, adminAddress);
                    
                    console.log('[summary/generate] Authorization transaction created, attempting decryption');
                    
                    // Decrypt using Seal
                    console.log('[summary/generate] Decrypting Seal entry', {
                      entryId: entry.id,
                      sealId: walrusEntry.sealId,
                      sealThreshold: walrusEntry.sealThreshold,
                    });
                    content = await hybridDecrypt({
                      encryptedData: walrusEntry.content,
                      method: 'seal',
                      walletAddress: userAddress,
                      sealEncryptedObject: walrusEntry.sealEncryptedObject,
                      sessionKey,
                      txBytes,
                      sealId: walrusEntry.sealId,
                      sealThreshold: walrusEntry.sealThreshold, // Use threshold saved during encryption
                    });
                    
                    console.log('[summary/generate] Seal decryption successful');
                  } catch (sealError: any) {
                    console.error(`[summary/generate] Failed to decrypt Seal-encrypted entry ${entry.id}:`, sealError);
                    console.error('[summary/generate] Seal decryption error details:', {
                      message: sealError?.message,
                      name: sealError?.name,
                      stack: sealError?.stack,
                    });
                    
                    // If Seal decryption fails, we cannot decrypt this entry
                    // Skip it for AI analysis
                    console.log(`[summary/generate] Skipping Seal-encrypted entry ${entry.id} for AI analysis due to decryption failure`);
                    return null;
                  }
                } else {
                  // Seal not configured or missing metadata - use crypto-js
                  console.log(`[summary/generate] Entry ${entry.id} is Seal-encrypted but Seal is not configured on server, using crypto-js fallback`);
                  content = decryptContent(walrusEntry.content, encryptionKey);
                }
                */
                } else {
                  // Use crypto-js decryption (legacy method)
                  content = decryptContent(walrusEntry.content, encryptionKey);
                }
              } else {
                throw new Error(`Failed to retrieve entry ${entry.id} from Walrus`);
              }
            } catch (error) {
              throw new Error(
                `Failed to retrieve entry ${entry.id} from Walrus: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          } else if (entry.encryptedContent) {
            // Legacy: decrypt from PostgreSQL (always uses crypto-js)
            content = decryptContent(entry.encryptedContent, encryptionKey);
          } else {
            throw new Error(`Entry ${entry.id} has no content (neither Walrus nor PostgreSQL)`);
          }

          return {
            date: entry.date.toISOString().split('T')[0],
            content,
            wordCount: entry.wordCount,
            decryptionError, // Include error if decryption failed
          };
        })
      );

      // Filter out entries that failed to decrypt
      decryptedEntriesList = decryptedEntriesResult.filter((entry) => entry !== null) as Array<{
        date: string;
        content: string;
        wordCount: number;
      }>;
    }

    // Validate that we have at least one valid entry
    if (decryptedEntriesList.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid entries found for this week',
          message: 'All entries failed to decrypt or were skipped.',
        },
        { status: 400 }
      );
    }

    // Use decryptedEntriesList for AI analysis
    const validEntries = decryptedEntriesList;

    // Warn if some entries were skipped (only for server-side decryption)
    // Note: Seal-encrypted entries are excluded from AI analysis

    // Use valid entries for AI analysis
    const entriesForAnalysis = validEntries;

    let analysis;
    try {
      analysis = await analyzeWeek(entriesForAnalysis);
    } catch (analysisError) {
      return NextResponse.json(
        {
          error: 'AI analysis failed',
          details: analysisError instanceof Error ? analysisError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    const { packageId, treasuryCapId } = getTokenConfig();
    const client = getSuiClient();

    const userCoins = await getUserCoins(userAddress, packageId);
    if (userCoins.length === 0) {
      return NextResponse.json(
        {
          error: 'No tokens on blockchain',
          details:
            'User has tokens in database but not on blockchain. Tokens may not have been minted yet.',
          databaseBalance: user.coinsBalance,
          onChainBalance: 0,
        },
        { status: 400 }
      );
    }

    let userCoinId: string | null = null;
    for (const coinId of userCoins) {
      try {
        const coinObject = await client.getObject({
          id: coinId,
          options: { showOwner: true, showContent: true },
        });

        if (coinObject.data?.owner) {
          const owner = (coinObject.data.owner as any).AddressOwner;
          if (owner?.toLowerCase() === userAddress.toLowerCase()) {
            if (coinObject.data?.content && 'fields' in coinObject.data.content) {
              const fields = coinObject.data.content.fields as any;
              const balance = parseInt(fields.balance || '0', 10);
              const balanceInTokens = balance / 10 ** 9;

              if (balanceInTokens >= SUMMARY_COST) {
                userCoinId = coinId;
                break;
              }
            }
          }
        }
      } catch (coinError) {
        // Skip invalid coins
      }
    }

    if (!userCoinId) {
      const onChainBalance = await getUserTokenBalance(userAddress, packageId);
      return NextResponse.json(
        {
          error: 'No valid coins found',
          details: `User has ${onChainBalance} tokens on-chain, but no coin object with sufficient balance (${SUMMARY_COST}) found.`,
          databaseBalance: user.coinsBalance,
          onChainBalance,
          required: SUMMARY_COST,
        },
        { status: 400 }
      );
    }

    const onChainBalance = await getUserTokenBalance(userAddress, packageId);
    if (onChainBalance < SUMMARY_COST) {
      return NextResponse.json(
        {
          error: 'Insufficient balance on blockchain',
          details: `User has ${onChainBalance} tokens on blockchain, but needs ${SUMMARY_COST}`,
          databaseBalance: user.coinsBalance,
          onChainBalance,
          required: SUMMARY_COST,
        },
        { status: 400 }
      );
    }

    const userTx = createUserBurnTransaction(
      packageId,
      treasuryCapId,
      userCoinId,
      SUMMARY_COST,
      userAddress
    );

    const kindBytes = await userTx.build({ client, onlyTransactionKind: true });

    let transactionBytes: string;
    let sponsorSignature: string;

    try {
      const sponsored = await sponsorTransaction(kindBytes, userAddress);
      transactionBytes = sponsored.transactionBytes;
      sponsorSignature = sponsored.sponsorSignature;
    } catch (sponsorError) {
      return NextResponse.json(
        {
          error: 'Failed to sponsor transaction',
          details: sponsorError instanceof Error ? sponsorError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresSignature: true,
      sponsoredTransaction: {
        transactionBytes: transactionBytes, // Already base64 string from sponsorTransaction
        sponsorSignature,
      },
      analysis: {
        emotions: analysis.emotions,
        summary: analysis.summary,
        insights: analysis.insights,
        trend: analysis.trend,
      },
      cost: SUMMARY_COST,
      message: 'Transaction sponsored. Sign with user wallet to complete.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function analyzeWeek(
  entries: Array<{ date: string; content: string; wordCount: number }>
): Promise<AnalysisResult> {
  // Check API key at runtime (not at module level)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in environment variables.'
    );
  }

  const entriesText = entries
    .map((e) => `Date: ${e.date}\nContent: ${e.content}\n---`)
    .join('\n\n');

  const prompt = `You are an emotional intelligence AI analyzing diary entries using Plutchik's Wheel of Emotions framework.

Analyze these diary entries from the past week and provide:

1. **Plutchik's 8 Emotions** (0-100% intensity for each):
   - Joy
   - Trust
   - Fear
   - Surprise
   - Sadness
   - Disgust
   - Anger
   - Anticipation

2. **Summary**: A brief 3-4 sentence summary of the week's emotional journey

3. **Insights**: 2-3 key insights or patterns you noticed

4. **Trend**: Overall emotional trend (improving/stable/declining)

Diary Entries:
${entriesText}

Respond in this exact JSON format:
{
  "emotions": {
    "joy": <0-100>,
    "trust": <0-100>,
    "fear": <0-100>,
    "surprise": <0-100>,
    "sadness": <0-100>,
    "disgust": <0-100>,
    "anger": <0-100>,
    "anticipation": <0-100>
  },
  "summary": "...",
  "insights": ["...", "...", "..."],
  "trend": "improving|stable|declining"
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://diarybeast.com',
      'X-Title': 'DiaryBeast',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error('Invalid OpenRouter response format: not valid JSON');
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid OpenRouter response format: missing choices or message');
  }

  let content = data.choices[0].message.content;

  // Strip markdown code blocks if present (OpenRouter sometimes wraps JSON in ```json ... ```)
  content = content.trim();
  if (content.startsWith('```')) {
    // Remove opening ```json or ```
    const lines = content.split('\n');
    if (lines[0].startsWith('```')) {
      lines.shift(); // Remove first line
    }
    // Remove closing ```
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop(); // Remove last line
    }
    content = lines.join('\n').trim();
  }

  let analysis: AnalysisResult;
  try {
    analysis = JSON.parse(content) as AnalysisResult;
  } catch (parseError) {
    throw new Error(
      `Invalid AI response format: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`
    );
  }

  return analysis;
}
