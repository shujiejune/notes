# Common Lisp Kickstart

## Syntax

Lisp syntax is made up of **S-expressions**.
An S-expression is either an **atom** or a **list**.
Atoms can be:

- numbers like 10, 3.14
- symbols like `t` (the truth constant)
- `+`
- `my_variable`
- a special kind of colon-prefixed symbols called keywords, e.g. `:thing`, `:keyword`. Keywords evaluate to themselves. You can think of them sort of like enums.

### How to Run Hello World

1. Interactive workflow (recommended)

In the terminal, run `sbcl` to enter the "Common Lisp User" default workspace.
Then run this command:

```lisp
(format t "Hello, world!")
```

Type `(quit)` to exit.

Or follow these steps:

- Run `sbcl` to start SBCL in the terminal.
- Inside the SBCL REPL (Read-Eval-Print Loop), load the file using `(load "hello.lisp")`.
- Iterate: You can define functions in the file, and re-run `(load "hello.lisp")` to update the running program without restarting SBCL.

2. Running as a script

To run a file like a shell script, use the `--script` flag.
Create a file named `hello.lisp` and run:

```sh
sbcl --script hello.lisp
```

3. Compiling to an executable

If you eventually need to distribute a standalone binary, SBCL provides a function called `sb-ext:save-lisp-and-die`.

```lisp
(require "asdf")
(defun my-main ()
  ;; ~% is a newline character
  (format t "Hello from a binary!~%"))

(uiop:dump-image "my-program" :executable t :toplevel #'my-main)
```

You can then run this file directly from the terminal using `./my-program`.

### Comments

Single line and multi-line comments look like this:

```lisp
;; Single line comments start with a semicolon

#|
  This is a multi-line comment.

  #|
    They can be nested!
  |#
|#
```

## Functions

You define functions using the `defun` macro.

```lisp
(defun fib (n)
  "Return the nth Fibonacci number."
  (if (< n 2)
    n
    (+ (fib (- n 1))
       (fib (- n 2)))))
```
