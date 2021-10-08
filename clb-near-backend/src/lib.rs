// https://stackoverflow.com/questions/47529643/how-to-return-a-string-or-similar-from-rust-in-webassembly
extern crate wasm_bindgen;
extern crate console_error_panic_hook;
extern crate sharks;
extern crate js_sys;
extern crate core;

use wasm_bindgen::prelude::*;
use sharks::{ Sharks, Share };
use core::convert::TryFrom;
use js_sys::JsString;

// The wasm-pack uses wasm-bindgen to build and generate JavaScript binding file.
// Import the wasm-bindgen crate.
use wasm_bindgen::prelude::*;


// // https://wasmbyexample.dev/examples/webassembly-linear-memory/webassembly-linear-memory.rust.en-us.html
// Create a static mutable byte buffer.
// We will use for passing memory between js and wasm.
// NOTE: global `static mut` means we will have "unsafe" code
// but for passing memory between js and wasm should be fine.
const WASM_MEMORY_BUFFER_SIZE: usize = 2;
static mut WASM_MEMORY_BUFFER: [u8; WASM_MEMORY_BUFFER_SIZE] = [0; WASM_MEMORY_BUFFER_SIZE];

// Function to store the passed value at index 0,
// in our buffer
#[wasm_bindgen]
pub fn store_value_in_wasm_memory_buffer_index_zero(value: u8) {
    unsafe {
        WASM_MEMORY_BUFFER[0] = value;
    }
}

// Function to return a pointer to our buffer
// in wasm memory
#[wasm_bindgen]
pub fn get_wasm_memory_buffer_pointer() -> *const u8 {
    let pointer: *const u8;
    unsafe {
        pointer = WASM_MEMORY_BUFFER.as_ptr();
    }

    return pointer;
}

// Function to read from index 1 of our buffer
// And return the value at the index
#[wasm_bindgen]
pub fn read_wasm_memory_buffer_and_return_index_one() -> u8 {
    let value: u8;
    unsafe {
        value = WASM_MEMORY_BUFFER[1];
    }
    return value;
}

#[wasm_bindgen]
pub fn do_shamir_secrets(secret_str : &str, size: u8) -> js_sys::Uint8Array {
    // Set a minimum threshold of 10 shares
    console_error_panic_hook::set_once();
    let shares_size:usize = size.into();
    web_sys::console::log_2(&"Shamirs secret using shares: ".into(),&JsValue::from(shares_size));
    let sharks = Sharks(shares_size as u8);
    let secret_vec = secret_str.as_bytes().to_vec();
    // We have up to 256 Shares
    let dealer = sharks.dealer(&secret_vec);
    // We take a subset of the Shares
    let shares: Vec<Share> = dealer.take(shares_size).collect();

    // Recover the original secret!
    let secret_recovered = sharks.recover(shares.as_slice()).unwrap();
    assert_eq!(String::from_utf8(secret_vec).unwrap(), secret_str);

    // Prepare a header vector
    let mut header_vec = Vec::new();
    // First byte is the number of shares
    header_vec.push(shares_size as u8);

    // The content vector
    let mut content_vec:Vec<u8> = Vec::new();
    for share  in shares {
        let mut share_content:Vec<u8> = Vec::from(&share);
        header_vec.push(share_content.len() as u8);
        web_sys::console::log_2(&"Got a share of length: ".into(),&JsValue::from(share_content.len()));
        content_vec.append(& mut share_content);
    }
    header_vec.append(& mut content_vec);
    //let s = String::from_utf8(secret_vec);
    web_sys::console::log_2(&"Returning Shamirs base vector (incl. header): ".into(),&JsValue::from(header_vec.len()) );
    js_sys::Uint8Array::from(&header_vec[..])
}

// https://stackoverflow.com/questions/60171056/wasm-bindgen-arrays-of-u8-as-inputs-and-outputs-generated-javascript-has-diffe
#[wasm_bindgen]
pub fn recover_shamir_secrets(shares_vec : Box<[u8]>) -> String {
    web_sys::console::log_2(&"WASM: Array Size: ".into(),&JsValue::from(shares_vec.len()));
    let shares_size: usize = shares_vec[0] as usize;
    let mut start_pos:usize = (shares_vec[0]+1) as usize;
    let mut end_pos: usize = (shares_vec[0]+1) as usize;
    let mut shares_bytes:Vec<Vec<&[u8]>> = Vec::new();
    let mut shares: Vec<Share> = Vec::new();

    let sharks = Sharks(shares_size as u8);
    // Header extraction
    web_sys::console::log_2(&"WASM: Got shares: ".into(),&JsValue::from(shares_size));

    for i in 1..=shares_size
    {
        end_pos +=   shares_vec[i] as usize;
        web_sys::console::log_3(&"Share: reading: ".into(), &JsValue::from(start_pos), &JsValue::from(end_pos));
        shares.push(Share::try_from(&shares_vec[start_pos ..end_pos]).unwrap());
        start_pos = end_pos;
    }
    let secret :Vec<u8>= sharks.recover(&shares).unwrap();
    let secret_str = String::from_utf8(secret).unwrap();
    web_sys::console::log_2(&"The share ".into(), &JsValue::from(&secret_str));

    /*let shares: Vec<Share> = shares_bytes.iter().map(|s| Share::try_from(s.as_slice()).unwrap()).collect();
    let secret :Vec<u8>= sharks.recover(&shares).unwrap();
    let secret_str = String::from_utf8(secret).unwrap();
    web_sys::console::log_2(&"The share ".into(), &JsValue::from(&secret_str));
    secret_str */
    "dump".into()
}

