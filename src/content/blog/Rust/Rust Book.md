---
title: 'Rust Book'
description: 'Notes from reading The Rust Book: cargo, ownership, and the type system.'
pubDate: 2026-06-21
tags: ['rust']
type: Note
---
# Rust Book
## Getting Started

Create a new project: `cargo new project`

Build and run a cargo project (from the project directory):

```sh
cargo build # creates an executable in ./target/debug/project_name
cargo build --release # creates an executable in ./target/release/project_name
cargo check # checks the code to make sure it compiles without producing an executable
cargo run   # compile and run in one command
```

Print text to the screen: `println!("Hello, World!");`

`println!` calls a Rust macro, which is a way to write code that generates code to extend Rust syntax.

## Guessing Game

To obtain user input and print the result as output, bring the `io` library into scope: `use std::io;`

Use the `let` statement to create variables (immutable by default):

```rust
let mut guess = String::new()
```

`mut` makes it mutable, and `String::new` is an associated function of the `String` type.

Receive user input:

```rust
io::stdin()
    .read_line(&mut guess)
    .expect("Failed to read line");
```

The `std::io::stdin` function returns an instance of `std::io::Stdin`, which is a type that represents a handle to the standard input of the terminal.

The `read_line` function takes what the user writes into the standard input (as a reference, which enables multiple parts of the code access one piece of data without copying that data into memory multiple times) and append it to a string. It returns a `Result` value, which is an enum, each possible state is called a variant.

`Result`'s variants are `Ok` and `Err`, and has an `expect` method that will cause the program to crash and display the message you pass as an argument to expect, on an `Err` value.

`{}` is used to hold a value in place.

```rust
let x = 5;
let y = 10;
println!("x = {x} and y + 2 = {}", y + 2);
```

A crate is a collection of Rust source code files. We need to include the library crates in `Cargo.toml`.

```toml
[dependencies]
rand = "0.8.5"
```

`cargo update` ignores the `Cargo.lock` file and figures out all the latest versions fitting your specs.

`cargo doc --open` builds doc provided by all your dependencies locally and opens it in the browser.

Use rand crate to generate a random number:

```rust
use rand::Rng;

fn main() {
	let secret_number = rand::thread_rng().gen_range(1..=100);
}
```

`rand::thread_rng` is local to the current thread and is seeded by the OS, defined by the `Rng` trait.

`gen_range` takes a range expression (`start..=end`, inclusive on the lower and upper bounds) as an argument and generates a random number in the range.

Compare numbers:

```rust
use std::cmp::Ordering;

match guess.cmp(&secret_number) {
    Ordering::Less => println!("Too small!"),
    Ordering::Greater => println!("Too big!"),
    Ordering::Equal => println!("You win!"),
}
```

`Ordering` is another enum with variants `Less`, `Greater`, and `Equal`.

`cmp` compares 2 values and can be called on anything that can be compared, and returns a variant of `Ordering`.

A `match` expression is made up of arms. An arm consists of a pattern to match against, and the code to run if the value given to `match` fits the pattern. Rust takes the argument and loops through arms.
