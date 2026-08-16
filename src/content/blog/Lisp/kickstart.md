---
title: 'Common Lisp Kickstart'
description: 'A quick introduction to Common Lisp syntax and S-expressions.'
pubDate: 2026-07-16
tags: ['lisp']
---
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

### Define functions using the `defun` macro

```lisp
(defun fib (n)
  "Return the nth Fibonacci number."
  (if (< n 2)
    n
    (+ (fib (- n 1))
       (fib (- n 2)))))
```

### Anonymous Functions

An anonymous function (lambda) in Common Lisp looks like:

```lisp
(lambda (x) (* x x))
```

`lambda` is a formal list structure `(lambda (params) body)`. Because Lisp code is a list, the syntax is literal and structural.

### Application

Functions can be called indirectly using `funcall` or with `apply`:

```lisp
(funcall #'fib 30)
;; or
(apply #'fib (list 30))
```

In Common Lisp, `#'` is a reader macro that acts as a shortcut for `(function ...)`.

- context: Common Lisp uses Lisp-2 scoping, meaning functions and variables live in separate namespaces.
- meaning: When you just type `fib`, Lisp looks for the variable named "fib". When you type `#'fib`, you are telling Lisp: I want the function object associated with the symbol `fib`.

So you can think of `#'` as the function-getter operator.

The difference between `funcall` and `apply` is how they handle arguments.

- `funcall`: You list the arguments individually. It expects them to be spread out. `(funcall #'fib 30)` is like calling `(fib 30)`.
- `apply`: It expects the final argument to be a list, which it then unpacks into individual arguments for the function. `(apply #'fib (list 30))` is telling Lisp: Take the function `fib` and apply it to the elements found in the list `(30)`.

### Multiple return values

You can have multiple return values.
Common ways to handle multiple values:

- `multiple-value-list`: Explicitly converts the multiple return values into a list.
- `multiple-value-bind`: Allows you to assign the multiple values to individual variables in one go.

```lisp
(defun many (n)
  (values n (* n 2) (* n 3)))

;; in SBCL REPL
(multiple-value-list (many 2))
(nth-value 1 (many 2))
```

In Common Lisp, `values` allows a function to return multiple distinct values simultaneously.
These values are not a list.
If you simply called `(many 2)` in REPL, it would print all 3 numbers; but if you assigned that call to a variable, you would only capture the first value. The other 2 values effectively disappear unless you explicitly catch them using special operators.
This is a "parallel" feature, distinct from returning a single object like a list or an array.

`nth` works on an existing list object in memory.
`nth-value` works on the multiple-value stream produced by a function call.

```lisp
(multiple-value-bind (a b c) (many 2)
  (format t "a is ~a, b is ~a, c is ~a~%" a b c))
```

Where `~a` prints an object in a human-readable format, `~%` moves to the next line.
