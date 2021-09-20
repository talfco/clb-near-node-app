const rust = import('../../clb-near-wasm/pkg');
rust
    .then(m => m.greet('World!'))
    .catch(console.error);

//import("clb-near-wasm").then(module => {
//    module.greet("Jane");
//    module.do_shamir_secrets();
//});