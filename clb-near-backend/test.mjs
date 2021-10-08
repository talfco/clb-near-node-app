import wasmInit from "./dist/index.js";
//const wasmInit = import('./dist/index.js');

const runWasm = async () => {
    // Instantiate our wasm module
    //const rustWasm = await wasmInit("./dist/index_bg.wasm");
    // Instantiate our wasm module
    const rustWasm = await wasmInit;

    var memory = new WebAssembly.Memory({initial:10, maximum:100});
    // First, let's have wasm write to our buffer
    rustWasm.store_value_in_wasm_memory_buffer_index_zero(24);

    // Next, let's create a Uint8Array of our wasm memory
    let wasmMemory = new Uint8Array(memory.buffer);

    wasmMemory[0] = 2;
    wasmMemory[1] = 1;
    wasmMemory[2] = 4;


    // Then, let's get the pointer to our buffer that is within wasmMemory
    let bufferPointer = rustWasm.get_wasm_memory_buffer_pointer();


    // First, let's write to index one of our buffer
    wasmMemory[bufferPointer + 1] = 15;


    /**
     * NOTE: if we were to continue reading and writing memory,
     * depending on how the memory is grown by rust, you may have
     * to re-create the Uint8Array since memory layout could change.
     * For example, `let wasmMemory = new Uint8Array(rustWasm.memory.buffer);`
     * In this example, we did not, but be aware this may happen :)
     */
};
runWasm();