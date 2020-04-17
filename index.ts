import * as AWS from 'aws-sdk';
import {readFileSync} from 'fs';
import {range} from 'ts-functional';
import * as Throttle from 'promise-parallel-throttle';

const fileName  = "XD Morphs - La Femme Basic Installer.zip";
const srcFolder = "E:/CrossDresser 4/Morph Packs/La Femme Basic/final";
const dstFolder = "products/xd4-morph-packs";
const Bucket    = "evilinnocence";

const Key = `${dstFolder}/${fileName}`;
const fullFileName = `${srcFolder}/${fileName}`;
const partSize = 5 * 1024 * 1024; // 5MB
const maxRetries = 10;

console.log("Uploading");
console.log(`    ${fullFileName}`);
console.log(`    ->`);
console.log(`    s3://${Bucket}/${Key} ...`);

const s3 = new AWS.S3();

interface IUploadResponse {
    ETag: string;
    PartNumber: number;
}
const uploadPart = (UploadId:string, PartNumber:number, data:Buffer):Promise<IUploadResponse> => new Promise((resolve, reject) => {
    const upload = (retryCount:number) => {
        const Body = data.slice((PartNumber - 1) * partSize, PartNumber * partSize);
        s3.uploadPart({Bucket, Key, UploadId, PartNumber, Body}, (err:AWS.AWSError, data:AWS.S3.UploadPartOutput) => {
            if(err) {
                if(retryCount > maxRetries) {
                    console.log(`    Part ${PartNumber} failed (${err.message}).  Too many failures.  Aborting`);
                    reject();
                } else {
                    console.log(`    Part ${PartNumber} failed (${err.message}).  Retrying (attempt ${retryCount})...`);
                    upload(retryCount + 1);
                }
            } else {
                console.log(`    Part ${PartNumber} succeeded`);
                resolve({
                    ETag: data.ETag,
                    PartNumber
                });
            }
        });
    }
    upload(1);
});

const abort = (UploadId:string) => () => {
    s3.abortMultipartUpload({Bucket, Key, UploadId}, (err:AWS.AWSError, data:AWS.S3.AbortMultipartUploadOutput) => {
        if(err) {
            console.log(`Abort multipart upload failed (${err.message}).  Remove parts manually.`);
        } else {
            console.log("Upload succeeded!");
        }
    });
}

console.log("Getting multipart upload id from S3...");
s3.createMultipartUpload({Bucket, Key}, (err:AWS.AWSError, data:AWS.S3.CreateMultipartUploadOutput) => {
    if(err) {
        console.log(`    Create multipart upload failed: ${err.message}`);
    } else {
        const UploadId = data.UploadId
        console.log(`    UploadId: ${UploadId}`);

        // Load the file
        console.log("Reading input file...");
        const inputFile:Buffer = readFileSync(fullFileName, {});
        console.log(`    File length: ${inputFile.length}`);

        // Determine how many parts there will be
        const partCount = Math.ceil(inputFile.length / partSize);
        console.log(`    Parts:  ${partCount}`);

        // Promise.all the part uploads
        console.log("Uploading parts...");
        Throttle.all(
            range(1, partCount).map((PartNumber:number) => () => uploadPart(UploadId, PartNumber, inputFile)),
            {maxInProgress: 3}
        )
            .then((parts) => {
                console.log("Completing multipart upload");
                s3.completeMultipartUpload(
                    {
                        Bucket,
                        Key,
                        MultipartUpload: {
                            Parts: parts.sort((a:IUploadResponse, b:IUploadResponse) => a.PartNumber - b.PartNumber),
                        },
                        UploadId,
                    },
                    (err:AWS.AWSError, data:AWS.S3.CompleteMultipartUploadOutput) => {
                        if(err) {
                            console.log(`Complete multipart upload failed (${err.message}).  Aborting...`);
                            abort(UploadId)();
                        }
                    }
                );
            })
            .catch(abort(UploadId));
    }
});
