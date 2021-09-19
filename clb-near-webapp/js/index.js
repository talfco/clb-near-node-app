// import("../pkg/index.js").catch(console.error);
import("clb-near-wasm").then(module => {
    module.greet("Jane");
});