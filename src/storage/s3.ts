import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.AWS_REGION!;
export const s3Bucket = process.env.S3_BUCKET!;

export const s3 = new S3Client({ region });

export async function putPdfObject(key: string, body: Buffer, sha256Hex: string) {
    const cmd = new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: body,
        ContentType: 'application/pdf',
        ServerSideEncryption: 'AES256',
        ChecksumSHA256: Buffer.from(sha256Hex, 'hex').toString('base64'),
        Tagging: 'purpose=document',
    });
    return s3.send(cmd);
}

export async function getPresignedGetUrl(key: string, ttlSeconds = 600) {
    const cmd = new GetObjectCommand({ Bucket: s3Bucket, Key: key, ResponseContentType: 'application/pdf' });
    return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}

export async function deleteObject(key: string) {
    const cmd = new DeleteObjectCommand({ Bucket: s3Bucket, Key: key });
    return s3.send(cmd);
}