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
const btoa = require('btoa');
const atob = require('atob');


const crypto = require("crypto");
const base64 = require('base-64');
const fs = require("fs");

// Rust WASM Code Integration
const wasmInit = import('./dist/index.js');
// you should always use the memory bindings provided by wasm-pack, and so, implicitly importing the memory allocation
// in the app.js
// https://www.reddit.com/r/rust/comments/dgjfn4/how_to_consume_a_uint8array_of_rust_pointer_in/
//
//const memory  = import('./dist/index_bg');

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

// Startup the App
app.listen(8000, function() {
    console.log('App running on port 8000');
    uploadToWeb3Store("Hello World","Test.txt",2);
});

// The REST interface
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

        uploadToWeb3Store(req.files[0].buffer.toString(), req.files[0].originalname, 2).then(r => function(value) {
            console.log("Sucess:"+value); // Success!
        }, function(reason) {
            console.log(reason); // Error!
        } )

        return res.status(200).send(req.files)
        // Everything went fine.
    })
});

// Functions

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


async function persistToIPFStore(file) {
    const storage = new Web3Storage({token: process.env.WEB3_STORAGE_TOKEN} );
    const cid = await storage.put([file]);
    console.log('Content '+file.name+ ' added with CID:'+ cid)
    return cid;
}

async function uploadToWeb3Store(fileContent, fileName, sharesLen) {
    wasmInit
        .then(async wasm => {
            // First part: Apply Shamir Secrets to the file content
            const result = wasm.do_shamir_secrets(fileContent,sharesLen);
            console.log("Number of shares: "+result[0]+" length: "+result.byteLength);
            var cids = [];
            var startPos = result[0]+1;
            var endPos = result[0]+1;
            // Split the returned Uint8Array into the secret shares
            for (var i = 1; i < result[0]+1; i++)
            {
                endPos += result[i];
                var share = result.slice(startPos,endPos);
                var b64encoded = Buffer.from(share).toString('base64')
                console.log("Share: "+i+"/"+result[i]+" reading bytes "+startPos+".."+endPos+" Array-Length "+share.length+" -> "+share);
                try {
                    const cid =  await persistToIPFStore(new File(b64encoded,'share'+i+'-'+fileName));
                    cids[i-1] = cid;
                } catch (err) {
                    console.error(err)
                }
                startPos = endPos;
            }
            // Let's try to retrieve
            downloadFromWeb3Store(wasm, cids,sharesLen);
        });
}

async function downloadFromWeb3Store(wasm, cids, sharesLen) {
    // The following snippet creates a new WebAssembly Memory instance with an initial size of 10 pages (640KiB),
    // and a maximum size of 100 pages (6.4MiB)
    let memory = new WebAssembly.Memory({initial:10, maximum:100});
    let sharesBytes = new Uint8Array(memory.buffer);
    sharesBytes[0]=sharesLen;
    let headerIndex= 1;
    let sharesBytesIndex = 1+sharesLen;

    const client = new Web3Storage({token: process.env.WEB3_STORAGE_TOKEN} );
    
    // Number of shares persisted in the Web3 Store
    for (let i=0; i<cids.length; i++) {
        const cid = cids[i];
        
        const res = await client.get(cid)
        console.log(`Web3Store Fetch response! [${res.status}] ${res.statusText}`)
        if (!res.ok) {
            throw new Error(`failed to get ${cid} - [${res.status}] ${res.statusText}`)
        }
        // Missing prepend, length of each share
        // unpack File objects from the response
        const files = await res.files()
        for (const file of files) {
            console.log(`${file.cid} -- ${file.size}`);
            const b64Encoded = await file.arrayBuffer();
            const buf = new Buffer(new TextDecoder().decode(b64Encoded),'base64');
            // Adding the File Length in the Header Part
            console.log("Webstore File ("+headerIndex+") Length: "+buf.length);
            sharesBytes[headerIndex] = buf.length
            headerIndex++;
            // Adding the File Content
            console.log("Got String: "+String.fromCharCode.apply(null, new Uint8Array(buf)));
            for (let j=0; j < buf.byteLength; j++) {
                sharesBytes[sharesBytesIndex] = buf[j];
                sharesBytesIndex++;
            }
            // sharesBytes = concatTypedArrays(sharesBytes,buf);
        }
    }
    const secretStr = wasm.recover_shamir_secrets(sharesBytes);
    console.log(secretStr);
}

function concatTypedArrays( buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array( buffer2), buffer1.byteLength);
    return tmp.buffer;
}
