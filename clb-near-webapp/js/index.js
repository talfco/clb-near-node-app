
const process = require('process');
const minimist = require('minimist');
import { Web3Storage, File } from 'web3.storage/dist/bundle.esm.min.js'
const rust = import('../../clb-near-wasm/pkg/clb_near_wasm.js');
rust
    .then(m => {
        m.greet('World!');
        // We are getting back a UInt8Array
        var result = m.do_shamir_secrets('Hello World');
        console.log("First Byte: Number of shares: "+result[0]);
        var startPos = result[0]+1;
        var endPos = result[0]+1;
        var files=[];
        for (var i = 1; i < result[0]+1; i++)
        {
            endPos += result[i];
            var share = result.slice(startPos,endPos);
            console.log("Share: "+i+"/"+result[i]+" reading bytes "+startPos+".."+endPos+" -> "+share);
            try {
                files[i-1] = new File(share,'share-'+i+'.txt')
            } catch (err) {
                console.error(err)
            }
            startPos = endPos;
        }
        writeToWeb3Storage(files).then(r =>
            console.log("Web3 Storage write completed"));

    })
    .catch(console.error);

async function writeToWeb3Storage(files) {
    const storage = new Web3Storage({token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEEzNzFlOUMwOWZiMjhjMTVkRDhGMUI4NTQwM2YyN2ZlOTlFMkU1MzQiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2MzA0NDQ1NTgxMjgsIm5hbWUiOiJTU1NBIn0.zA1f4fhbwntvVW3RtKGeowjHK29rYHf0fM7edwwpewI"} );
    const cid = await storage.put(files)
    console.log('Content added with CID:', cid)
}

//import("clb-near-wasm").then(module => {
//    module.greet("Jane");
//    module.do_shamir_secrets();
//});