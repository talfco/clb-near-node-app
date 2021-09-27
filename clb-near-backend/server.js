require('global');
require('dotenv').config();
const process = require('process');
const minimist = require('minimist');
const { Web3Storage, File } = require('web3.storage');

const express = require('express');
const app = express();
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');

const crypto = require("crypto");
const base64 = require('base-64');
const fs = require("fs");

const wasmAdaptor = import('./dist/index.js');

app.use(cors())
app.use(morgan('dev'))

let storage = multer.memoryStorage({
    destination: function (req, file, cb) {
        cb(null, 'public')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' +file.originalname )
    }
})

let upload = multer({ storage: storage }).array('file')

app.get('/',function(req,res){
    return res.send('Hello Server')
})

app.post('/upload',function(req, res) {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(500).json(err)
            // A Multer error occurred when uploading.
        } else if (err) {
            return res.status(500).json(err)
            // An unknown error occurred when uploading.
        }
        console.log(req.files);
        console.log(req.files[0].buffer.toString());

        web3store(req.files[0].buffer.toString(), req.files[0].originalname).then(r => function(value) {
            console.log("Sucess:"+value); // Success!
        }, function(reason) {
            console.log(reason); // Error!
        } )

        return res.status(200).send(req.files)
        // Everything went fine.
    })
});

app.listen(8000, function() {
    console.log('App running on port 8000');
    uploadToWeb3Store("Hello World");
});

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

function doEncrypt(message) {
    const algorithm = "aes-256-cbc";
    // generate 16 bytes of random data
    const initVector = crypto.randomBytes(16);

    // secret key generate 32 bytes of random data
    //const Securitykey = crypto.randomBytes(32);
    //console.log("Security key: "+(Securitykey.toString("hex")));
    const securitykey = hexToBytes(process.env.AES_SECURITY_KEY);

    // the cipher function
    const cipher = crypto.createCipheriv(algorithm,  Buffer.from(securitykey), initVector);

    // encrypt the message
    // input encoding
    // output encoding
    let encryptedData = cipher.update(message, "utf-8", "hex");

    encryptedData += cipher.final("hex");
    initVectorHex = initVector.toString("hex");

    console.log("Encrypted message: " + initVectorHex+"."+encryptedData);
    //console.log("Encrypted message: " + base64.encode(initVector.toString("hex"))+"."+base64.encode(encryptedData));
    return initVectorHex+"."+encryptedData;
}



function web3store(fileContent, fileName) {
    const storage = new Web3Storage({token: process.env.WEB3_STORAGE_TOKEN} );
    let cids = [];
    let shares = doSSSAEncrypt(fileContent,fileName);
    for (let index in shares) {
        console.log('Content "+index+ " added with CID:', cid);
        cids[index]=cid;
    }
    return cids;
}

async function persistToIPFStore(file) {
    const storage = new Web3Storage({token: process.env.WEB3_STORAGE_TOKEN} );
    const cid = await storage.put([file]);
    console.log('Content '+file.name+ ' added with CID:'+ cid);
}

async function uploadToWeb3Store(fileContent) {
    wasmAdaptor
        .then(wasm => {
            // First part: Apply Shamir Secrets to the file content
            const result = wasm.do_shamir_secrets(fileContent);
            console.log("Number of shares: "+result[0]);
            var startPos = result[0]+1;
            var endPos = result[0]+1;
            // Split the returned Uint8Array into the secret shares
            for (var i = 1; i < result[0]+1; i++)
            {
                endPos += result[i];
                var share = result.slice(startPos,endPos);
                console.log("Share: "+i+"/"+result[i]+" reading bytes "+startPos+".."+endPos+" -> "+share);
                try {
                    persistToIPFStore(new File(share,'share-'+i+'.txt'));
                } catch (err) {
                    console.error(err)
                }
                startPos = endPos;
            }
        });
}
