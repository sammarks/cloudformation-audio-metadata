const AWS = require('aws-sdk')
const { spawnSync } = require('child_process')
const debug = require('debug')('cloudformation-audio-metadata')

const FFPROBE_PATH = '/opt/bin/ffprobe'
const s3 = new AWS.S3()
const sns = new AWS.SNS()
const snsTopic = process.env.SNS_TOPIC

const STATUSES = {
  PROCESSING: 'PROCESSING',
  ERROR: 'ERROR',
  COMPLETE: 'COMPLETE'
}

const reportStatusUpdate = async (bucket, key, status, detail) => {
  const payload = { bucket, key, status, detail }
  debug('reporting status update %O', payload)
  await sns.publish({
    Message: JSON.stringify(payload),
    TopicArn: snsTopic
  }).promise()
  debug('reported')
}

module.exports.handler = async (event) => {
  debug('incoming S3 message', event.Records[0].Sns.Message)
  const message = JSON.parse(event.Records[0].Sns.Message)
  debug('decoded message', message)
  const srcKey = decodeURIComponent(message.Records[0].s3.object.key).replace(/\+/g, ' ')
  const bucket = message.Records[0].s3.bucket.name

  await reportStatusUpdate(bucket, srcKey, STATUSES.PROCESSING)

  const target = s3.getSignedUrl('getObject', { Bucket: bucket, Key: srcKey, Expires: 60000 })

  try {
    debug('probing with ffprobe')
    const ffprobe = spawnSync(FFPROBE_PATH, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=nw=1:nk=1',
      target
    ])
    debug('ffprobe result %O', ffprobe)
    const duration = Math.ceil(ffprobe.stdout.toString())
    const metadata = {
      duration
    }
    await reportStatusUpdate(bucket, srcKey, STATUSES.COMPLETE, metadata)
  } catch (err) {
    debug('error found during processing')
    debug(err)
    await reportStatusUpdate(bucket, srcKey, STATUSES.ERROR, err.stack)
  }
}
