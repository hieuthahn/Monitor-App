import AWS from 'aws-sdk';
import {S3_ACCESS_KEY, S3_SECRET_KEY} from 'react-native-dotenv';

// Create an S3 client for IDrive e2
const s3 = new AWS.S3({
  endpoint: 'https://l7e2.sg.idrivee2-25.com', //your storage-endpoint
  accessKeyId: S3_ACCESS_KEY, //your access-key
  secretAccessKey: S3_SECRET_KEY, //your secret-key
});

export const uploadFileS3 = async (files: any) => {
  return new Promise((resolve, reject) => {
    // upload object 'local-object' as 'my-object' in bucket 'my-bucket' params
    var params = {
      Bucket: 'uploads',
      Key: 'my-object',
      Body: files,
    };

    // put object call
    s3.putObject(params, function (err, data) {
      if (err) {
        console.log('Error:', err);
        reject(err);
      } else {
        console.log('Success:', data);
        resolve(data);
      }
    });
  });
};
