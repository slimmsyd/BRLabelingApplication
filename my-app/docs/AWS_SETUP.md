# AWS Integration Setup

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# S3 Configuration
S3_BUCKET=com.boxrawlabs.labelling-app-test-data.unsecured
CLOUDFRONT_URL=https://do5dznmsu0r6j.cloudfront.net

# DynamoDB Configuration
DYNAMODB_VDS_TABLE=VideoDataSource-main
```

## AWS Services Used

### S3 (Simple Storage Service)
- **Purpose**: Store video files
- **Bucket**: `com.boxrawlabs.labelling-app-test-data.unsecured`
- **Access**: Via CloudFront CDN
- **Naming Convention**: `{Boxer1} v {Boxer2}- {date}/{boxer1slug}_{boxer2slug}_c{cam}_r{round}.mp4`

### DynamoDB
- **Purpose**: Store video metadata and labeler assignments
- **Table**: `VideoDataSource-main` (or `VideoDataSource-test`)
- **Primary Key**: `id` (UUID)
- **Schema**: See `VideoDataSource` interface in `lib/aws.ts`

### CloudFront
- **Purpose**: CDN for fast video delivery
- **URL**: `https://do5dznmsu0r6j.cloudfront.net`
- **Origin**: S3 bucket

## AWS Credentials Setup

### Option 1: Environment Variables (Recommended for Development)
Set the variables in `.env.local` as shown above.

### Option 2: AWS CLI Configuration
If you have AWS CLI configured, the SDK will automatically use those credentials.

```bash
aws configure
```

## Testing AWS Connection

You can test the AWS connection by running:

```bash
npm run dev
```

Then check the console for any AWS-related errors when uploading a video.

## Security Notes

- **Never commit** `.env.local` to version control
- Use **IAM roles** with minimal permissions in production
- Consider using **AWS Secrets Manager** for production credentials
- Enable **S3 bucket versioning** for data protection

## Required IAM Permissions

Your AWS user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::com.boxrawlabs.labelling-app-test-data.unsecured/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/VideoDataSource-*"
    }
  ]
}
```
