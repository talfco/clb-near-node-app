extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

use std::io::Write;
use std::fs;
use std::fs::File;
use std::format;

extern crate shamir;
use shamir::SecretData;

#[wasm_bindgen]
extern {
    pub fn alert(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn log(msg: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
    log(&format!("Hello {}!", name));
}

#[wasm_bindgen]
pub fn shamir() {
    let shares = 3;
    let secret_data = SecretData::with_secret("Hello World!", shares);

    for number in 1..shares+1 {
        write_to_file(number as i32, &secret_data.get_share(number).unwrap());
    }
    let share1 = read_from_file(1);
    let share2 = read_from_file(2);
    let share3 = read_from_file(3);
    //let share1: Vec<u8> = share1str.as_bytes().to_vec();

    let recovered = SecretData::recover_secret(3, vec![share1, share2, share3]).unwrap();
    println!("Recovered: {}", recovered);

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

fn read_from_file(pos: i32) -> Vec<u8> {
    let content = fs::read(format!("foo-{}.txt",pos))
        .expect("Something went wrong reading the file");
    content
}