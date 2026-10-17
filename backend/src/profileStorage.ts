import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET ?? "harkkalogi-profile-images";
const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:19000";
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;

if (!accessKeyId || !secretAccessKey) {
  throw new Error(
    "S3_ACCESS_KEY and S3_SECRET_KEY must be configured for profile image storage."
  );
}

export const profileImageBucket = bucket;
export const s3Client = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

export async function ensureProfileImageBucket(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "$metadata" in error &&
      error.$metadata && typeof error.$metadata === "object" &&
      "httpStatusCode" in error.$metadata
        ? error.$metadata.httpStatusCode
        : undefined;
    if (statusCode !== 404) throw error;
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export function profileImageKey(userId: number): string {
  return `profile-images/${userId}`;
}

export async function saveProfileImage(
  userId: number,
  body: Buffer,
  contentType: string
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: profileImageKey(userId),
      Body: body,
      ContentLength: body.length,
      ContentType: contentType,
      CacheControl: "private, no-store",
    })
  );
}

export async function getProfileImage(userId: number) {
  return s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: profileImageKey(userId) })
  );
}

export async function deleteProfileImage(userId: number): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: profileImageKey(userId) })
  );
}
