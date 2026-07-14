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

In the terminal, run `sbcl` to enter the "Common Lisp User" default workspace.
Then run this command:

```lisp
(format t "Hello, world!")
```

Type `(quit)`to exit.

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


