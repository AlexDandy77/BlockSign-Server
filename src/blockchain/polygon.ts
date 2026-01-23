import { ethers } from 'ethers';
import { env } from '../env.js';

export interface AnchorResult {
    txId: string;
    explorerUrl: string;
    network: string;
    blockNumber?: number;
}

export class PolygonAnchor {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private explorerBase: string;

    constructor() {
        if (!env.COMPANY_WALLET_PRIVATE_KEY) {
            throw new Error('COMPANY_WALLET_PRIVATE_KEY is required for blockchain anchoring');
        }
        
        this.provider = new ethers.JsonRpcProvider(env.BLOCKCHAIN_RPC_URL);
        this.wallet = new ethers.Wallet(env.COMPANY_WALLET_PRIVATE_KEY, this.provider);
        this.explorerBase = env.BLOCKCHAIN_EXPLORER_BASE;
    }

    /**
     * Anchor document data to Polygon blockchain
     * Sends a transaction with document metadata in the data field
     */
    async anchorDocument(documentData: {
        documentId: string;
        sha256Hex: string;
        title: string;
        ownerUsername: string;
        participantUsernames: string[];
        canonicalPayload: string;
    }): Promise<AnchorResult> {
        try {
            console.log(`[Polygon] Anchoring document ${documentData.documentId}...`);

            // Create metadata to store on-chain
            const metadata = {
                docId: documentData.documentId,
                hash: documentData.sha256Hex,
                title: documentData.title,
                owner: documentData.ownerUsername,
                participants: documentData.participantUsernames,
                timestamp: new Date().toISOString(),
            };

            // Add BlockSign prefix and format as readable string
            const blockSignPrefix = 'BlockSign:';
            const metadataJson = JSON.stringify(metadata);
            const metadataWithPrefix = blockSignPrefix + metadataJson;

            // Convert metadata to hex - store full metadata
            const metadataHex = ethers.hexlify(
                ethers.toUtf8Bytes(metadataWithPrefix)
            );

            console.log(`[Polygon] Metadata size: ${metadataHex.length} chars`);

            // Get current gas prices and boost priority fee for rapid confirmation
            const feeData = await this.provider.getFeeData();
            const baseFee = feeData.maxFeePerGas ?? ethers.parseUnits('100', 'gwei');
            const priorityFee = feeData.maxPriorityFeePerGas ?? ethers.parseUnits('30', 'gwei');
            
            // Boost priority fee by 50% for faster inclusion (~18 secs)
            const boostedPriorityFee = (priorityFee * 150n) / 100n;
            const maxFee = baseFee + boostedPriorityFee;

            console.log(`[Polygon] Gas: maxFee=${ethers.formatUnits(maxFee, 'gwei')} gwei, priorityFee=${ethers.formatUnits(boostedPriorityFee, 'gwei')} gwei`);

            // Create transaction with metadata in data field
            const tx = await this.wallet.sendTransaction({
                to: this.wallet.address, // Send to self (company address)
                value: 0n, // No value transfer, just data
                data: metadataHex,
                gasLimit: 100000n,
                maxFeePerGas: maxFee,
                maxPriorityFeePerGas: boostedPriorityFee
            });

            console.log(`[Polygon] Transaction sent: ${tx.hash}`);

            // Wait for confirmation (1 block)
            const receipt = await tx.wait(1);

            if (!receipt) {
                throw new Error('Transaction receipt not available');
            }

            console.log(`[Polygon] Transaction confirmed in block ${receipt.blockNumber}`);

            const explorerUrl = `${this.explorerBase}/tx/${receipt.hash}`;

            return {
                txId: receipt.hash,
                explorerUrl,
                network: 'polygon',
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('[Polygon] Anchoring failed:', error);
            throw new Error(`Failed to anchor to Polygon: ${error}`);
        }
    }

    /**
     * Verify a transaction exists and retrieve its data
     */
    async verifyTransaction(txId: string): Promise<any> {
        try {
            const tx = await this.provider.getTransaction(txId);
            if (!tx) {
                throw new Error('Transaction not found');
            }

            const receipt = await this.provider.getTransactionReceipt(txId);
            if (!receipt) {
                throw new Error('Transaction receipt not found');
            }

            // Decode data field
            let metadata = null;
            if (tx.data && tx.data !== '0x') {
                try {
                    const decoded = ethers.toUtf8String(tx.data);
                    // Remove BlockSign prefix if present
                    const jsonString = decoded.startsWith('BlockSign:') 
                        ? decoded.substring('BlockSign:'.length)
                        : decoded;
                    metadata = JSON.parse(jsonString);
                } catch (e) {
                    console.error('Failed to decode transaction data:', e);
                }
            }

            return {
                txId: tx.hash,
                blockNumber: receipt.blockNumber,
                from: tx.from,
                confirmed: receipt.status === 1,
                metadata,
                explorerUrl: `${this.explorerBase}/tx/${tx.hash}`
            };
        } catch (error) {
            console.error('[Polygon] Transaction verification failed:', error);
            throw error;
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(): Promise<string> {
        try {
            const balance = await this.provider.getBalance(this.wallet.address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('[Polygon] Failed to get balance:', error);
            throw error;
        }
    }

    /**
     * Get company wallet address
     */
    getAddress(): string {
        return this.wallet.address;
    }

    /**
     * Check if blockchain is properly configured
     */
    isConfigured(): boolean {
        return !!(env.COMPANY_WALLET_PRIVATE_KEY && env.COMPANY_WALLET_ADDRESS);
    }
}

// Singleton instance
let instance: PolygonAnchor | null = null;

export function getPolygonAnchor(): PolygonAnchor {
    if (!instance) {
        instance = new PolygonAnchor();
    }
    return instance;
}
