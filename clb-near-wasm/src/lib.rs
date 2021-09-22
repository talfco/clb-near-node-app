// https://stackoverflow.com/questions/47529643/how-to-return-a-string-or-similar-from-rust-in-webassembly
extern crate wasm_bindgen;
extern crate console_error_panic_hook;
extern crate sharks;
extern crate js_sys;


use wasm_bindgen::prelude::*;

use std::io::Write;
use std::fs;
use std::fs::File;
use std::format;
use sharks::{ Sharks, Share };



// TEST SAMPLES
fn using_web_sys() {
    web_sys::console::log_1(&"Hello using web-sys".into());
    let js: JsValue = 4.into();
    web_sys::console::log_2(&"Logging arbitrary values looks like".into(), &js);
}

// Calling external functions in Java Script from Rust
#[wasm_bindgen]
extern {
    pub fn alert(s: &str);
}

// Production Rust Functions which can be called by Java Script
#[wasm_bindgen]
pub fn greet(name: &str) {
    console_error_panic_hook::set_once();
    alert(&format!("Hello, {}!", name));
    using_web_sys();
}

#[wasm_bindgen]
pub fn do_shamir_secrets(secret_str : &str) -> js_sys::Uint8Array {
    // Set a minimum threshold of 10 shares
    let shares_size:usize = 10;
    web_sys::console::log_2(&"Shamirs secret using shares: ".into(),&JsValue::from(shares_size));
    let sharks = Sharks(shares_size as u8);
    let secret_vec = secret_str.as_bytes().to_vec();
    let dealer = sharks.dealer(&secret_vec);
    let shares: Vec<Share> = dealer.take(shares_size).collect();
    // Recover the original secret!
    let secret_recovered = sharks.recover(shares.as_slice()).unwrap();
    assert_eq!(String::from_utf8(secret_vec).unwrap(), secret_str);
    let mut i: usize = 0;
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
    web_sys::console::log_2(&"Returning Shamirs base vector: ".into(),&JsValue::from(header_vec.len()) );
    js_sys::Uint8Array::from(&header_vec[..])
}

fn write_to_file(pos: i32, data: &Vec<u8>) -> std::io::Result<()> {
    // ? is unpacking the result record
    let mut buffer = File::create(format!("foo-{}.txt",pos))?;
    let reference = buffer.by_ref();
    // we can use reference just like our original buffer
    reference.write_all(data)?;
    // If not OK, the program returns
    Ok(())
}

fn read_from_file1(pos: i32) -> Vec<u8> {
    let content = fs::read(format!("foo-{}.txt",pos))
        .expect("Something went wrong reading the file");
    content
}