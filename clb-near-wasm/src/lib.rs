extern crate wasm_bindgen;
extern crate console_error_panic_hook;
extern crate sharks;

use wasm_bindgen::prelude::*;

use std::io::Write;
use std::fs;
use std::fs::File;
use std::format;
use sharks::{ Sharks, Share };

// use shamir::SecretData;
use std::ptr::null;

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
    do_shamir_secrets();
}

fn do_shamir_secrets() {

    // Set a minimum threshold of 10 shares
    let sharks = Sharks(10);
    // Obtain an iterator over the shares for secret [1, 2, 3, 4]
    let secret_str = "Hello World";
    let secret_vec = secret_str.as_bytes().to_vec();
    let dealer = sharks.dealer(&[1, 2, 3, 4]);
    //let dealer = sharks.dealer(&secret_vec);
    // Get 10 shares
    let shares: Vec<Share> = dealer.take(10).collect();
    // Recover the original secret!
    let secret = sharks.recover(shares.as_slice()).unwrap();
    assert_eq!(secret, vec![1, 2, 3, 4]);

    let s = String::from_utf8(secret_vec);
    web_sys::console::log_2(&"Got String Back".into(), &s.unwrap().into());
    //let secret_data = SecretData::with_secret("Hello World!", shares);
    web_sys::console::log_1(&"Shmair called with secret!".into());
    //for number in 1..shares+1 {
    //    write_to_file(number as i32, &secret_data.get_share(number).unwrap());
    //}
    //let share1 = read_from_file(1);
    //let share2 = read_from_file(2);
    //let share3 = read_from_file(3);
    //let share1: Vec<u8> = share1str.as_bytes().to_vec();

    //let recovered = SecretData::recover_secret(3, vec![share1, share2, share3]).unwrap();
    //println!("Recovered: {}", recovered);

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