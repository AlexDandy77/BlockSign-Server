import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function required(name: string, value: string | undefined): string {
    if (!value) throw new Error(`Missing env var: ${name}`);
    return value;
}

const region = required('AWS_REGION', process.env.AWS_REGION);
// Pending bucket: No lifecycle policy (for unsigned/partially signed documents)
export const s3BucketPending = required('S3_BUCKET_PENDING', process.env.S3_BUCKET_PENDING);
// Signed bucket: 10-day lifecycle policy (for fully signed documents)
export const s3BucketSigned = required('S3_BUCKET_SIGNED', process.env.S3_BUCKET_SIGNED);

export const s3 = new S3Client({ region });

export async function putPdfObject(key: string, body: Buffer, sha256Hex: string, bucket: string = s3BucketPending) {
    const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'application/pdf',
        ServerSideEncryption: 'AES256',
        ChecksumSHA256: Buffer.from(sha256Hex, 'hex').toString('base64'),
        Tagging: 'purpose=document',
    });
    return s3.send(cmd);
}

export async function getPresignedGetUrl(key: string, bucket: string = s3BucketPending, ttlSeconds = 600) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentType: 'application/pdf' });
    return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}

export async function deleteObject(key: string, bucket: string = s3BucketPending) {
    const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    return s3.send(cmd);
}

export async function streamObject(key: string, bucket: string = s3BucketPending) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return s3.send(cmd);
}

/**
 * Move document from pending bucket to signed bucket (with 10-day lifecycle)
 * This should be called when a document status changes to SIGNED
 */
export async function moveDocumentToSignedBucket(key: string) {
    try {
        // Copy from pending to signed bucket
        const copyCmd = new CopyObjectCommand({
            Bucket: s3BucketSigned,
            CopySource: `${s3BucketPending}/${key}`,
            Key: key,
            ContentType: 'application/pdf',
            ServerSideEncryption: 'AES256',
            Tagging: 'purpose=document&status=signed',
        });
        await s3.send(copyCmd);

        // Delete from pending bucket
        await deleteObject(key, s3BucketPending);

        console.log(`Document ${key} moved from pending to signed bucket`);
        return { success: true, bucket: s3BucketSigned };
    } catch (error) {
        console.error(`Failed to move document ${key} to signed bucket:`, error);
        throw error;
    }
}

/**
 * Get the correct bucket for a document based on its status
 */
export function getBucketForStatus(status: string): string {
    return status === 'SIGNED' ? s3BucketSigned : s3BucketPending;
}