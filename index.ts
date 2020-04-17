import * as AWS from 'aws-sdk';

const fileName  = "XD Morphs La Femme Basic Installer.zip";
const srcFolder = "E:/CrossDresser 4/Morph Packs/La Femme Basic";
const dstFolder = "products/xd4-morph-packs";
const Bucket    = "evilinnocence";

const Key = `${dstFolder}/${fileName}`;
const fullFileName = `${srcFolder}/${fileName}`;
const partSize = 5 * 1024 * 1024; // 5MB

console.log(`Uploading ${fullFileName} to s3://${Bucket}/${Key} ...`);

const s3 = new AWS.S3();

const uploadPart = (partNumber:number, data:Buffer) => new Promise((resolve, reject) => {

});

s3.createMultipartUpload({Bucket, Key}, (err:AWS.AWSError, data:AWS.S3.CreateMultipartUploadOutput) => {
    if(err) {
        console.log(err);
    } else {
        const id = data.UploadId;
        // Load the file
        // Determine how many parts there will be
        // Promise.all the part uploads
        // When complete, fire the completeMultipartUpload call
        // If failed, fire the abortMultipartUpload call
    }
});
