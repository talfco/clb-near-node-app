const rust = import('../../clb-near-wasm/pkg');
rust
    .then(m => {
        m.greet('World!');
        // We are getting back a UInt8Array
        var result = m.do_shamir_secrets('Hello World');
        console.log("First Byte: Number of shares: "+result[0]);
        var startPos = result[0]+1;
        var endPos = result[0]+1;
        for (var i = 1; i < result[0]+1; i++)
        {
            endPos += result[i];
            var share = result.slice(startPos,endPos);
            console.log("Share: "+i+"/"+result[i]+" reading bytes "+startpos+".."+endpos+" -> "+share);
            startPos = endPos;
        }
    })
    .catch(console.error);

//import("clb-near-wasm").then(module => {
//    module.greet("Jane");
//    module.do_shamir_secrets();
//});