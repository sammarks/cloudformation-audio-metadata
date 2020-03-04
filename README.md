![][header-image]

[![CircleCI](https://img.shields.io/circleci/build/github/sammarks/cloudformation-audio-metadata/master)](https://circleci.com/gh/sammarks/cloudformation-audio-metadata)
[![Coveralls](https://img.shields.io/coveralls/sammarks/cloudformation-audio-metadata.svg)](https://coveralls.io/github/sammarks/cloudformation-audio-metadata)
[![Dev Dependencies](https://david-dm.org/sammarks/cloudformation-audio-metadata/dev-status.svg)](https://david-dm.org/sammarks/cloudformation-audio-metadata?type=dev)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/sammarks15)

`cloudformation-audio-metadata` is an AWS SAM + CloudFormation template designed to ingest videos
from an input S3 bucket, generate thumbnails for them at predetermined points (or "marks") at the
original resolution of the video, upload them back to a destination S3 bucket, and send an SNS
notification with the details of the process.

It also utilizes [serverlesspub's ffmpeg-aws-lambda-layer package](https://github.com/serverlesspub/ffmpeg-aws-lambda-layer) for easily packaging ffmpeg with the Lambda function.

## Get Started

It's simple! Click this fancy button:

[![Launch Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=audio-metadata&templateURL=https://sammarks-cf-templates.s3.amazonaws.com/audio-metadata/template.yaml)

Then give the stack a name, and configure it:

### Parameters

| Parameter | Required | Default Value | Description |
| --- | --- | --- | --- |
| InputBucketName | **Yes** | | The name of the bucket to use for audio inputs. |
| DebugLevel | No | `<empty string>` | The `DEBUG` environment variable for the Lambda. Set to `cloudformation-audio-metadata` to enable debug messages. |

### Outputs

| Output | Description |
| --- | --- |
| InputBucket | The name of the bucket where audio files should be uploaded. |
| InputBucketArn | The ARN for the bucket where audio files should be uploaded. |
| Topic | The ARN for the SNS Topic to subscribe to for metadata notifications. |
| S3Topic | The ARN for the SNS Topic to subscribe to for object creation notifications from the input bucket. |

### Usage in Another Stack or Serverless

Add something like this underneath resources:

```yaml
videoThumbnailStack:
  Type: AWS::CloudFormation::Stack
  Properties:
    TemplateURL: https://sammarks-cf-templates.s3.amazonaws.com/audio-metadata/VERSION/template.yaml
    Parameters:
      InputBucketName: test-input-bucket
      DebugLevel: ''
```

**Note:** This stack will require the `CAPABILITY_AUTO_EXPAND` capability when deploying
the parent stack with CloudFormation. If you are using the Serverless framework, you can
"trick" it into adding the required capabilities by adding this to your `serverless.yaml`:

```yaml
resources:
  Transform: 'AWS::Serverless-2016-10-31' # Trigger Serverless to add CAPABILITY_AUTO_EXPAND
  Resources:
    otherResource: # ... all of your original resources
```

### Regions

**A quick note on regions:** If you are deploying this stack in a region other than `us-east-1`,
you need to reference the proper region S3 bucket as we're deploying Lambda functions. Just
add the region suffix to the template URL, so this:

```
https://sammarks-cf-templates.s3.amazonaws.com/audio-metadata/VERSION/template.yaml
```

becomes this:

```
https://sammarks-cf-templates-us-east-2.s3.amazonaws.com/audio-metadata/VERSION/template.yaml
```

### Subscribing to object creation events

S3 does not allow two separate Lambda functions to be subscribed to the same
event types on a single bucket. Because of this, the template creates an SNS
topic to serve as the messenger for the S3 notifications, and the internal
Lambda function subscribes to that SNS topic.

Because of this, if you want to subscribe to the object creation events in your
own Lambda functions, simply create a Lambda function that references the
`S3Topic` output of this stack.

### What's deployed?

- One S3 buckets: one for audio input.
- A SNS topic for notifications.
- A SNS topic for object created notifications for the input bucket.
- A Lambda function to process the audio files.

### How does it work?

The Lambda goes through the following process:

- Grab the length of the audio file using `ffprobe`
- Send a notification to SNS once we have the length of the audio file.

### Accessing Previous Versions & Upgrading

Each time a release is made in this repository, the corresponding template is available at:

```
https://sammarks-cf-templates.s3.amazonaws.com/audio-metadata/VERSION/template.yaml
```

**On upgrading:** I actually _recommend_ you lock the template you use to a specific version. Then, if you want to update to a new version, all you have to change in your CloudFormation template is the version and AWS will automatically delete the old stack and re-create the new one for you.

## Features

- Automatically determine the length of an audio file uploaded to a S3 bucket.
- Reports the duration to a SNS topic.
- Send notifications about updates and error messages to a SNS topic.
- Deploy with other CloudFormation-compatible frameworks (like the Serverless framework).
- All functionality is self-contained within one CloudFormation template. Delete the template, and all of our created resources are removed.

## Why use this?

Right now this library just reports the duration of any audio file uploaded to a specific
S3 bucket. Use this if you want to automatically calculate the length of a file yourself
instead of relying on clients to upload accurate information.

[header-image]: https://raw.githubusercontent.com/sammarks/art/master/cloudformation-audio-metadata/header.jpg
