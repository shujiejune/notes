# Interface

## 1. What is the underlying mechanism of `interface` in Go?

In Go, an `interface` is not just a **compile-time contract**, it is also an actual, **concrete object** that occupies physical space in memory (8 or 16 bytes) at runtime.
An interface is a **two-word data structure (a container)** that has a physical presence on the stack or heap. Think of it as an empty cardboard box with a double-compartment interior:
- Box 1 (Type Compartment): Stores a pointer to the type definition of whatever you put inside it.
- Box 2 (Data Compartment): Stores a pointer to a copy of the actual data you put inside it.
Unlike Java/C++ which rely on explicit inheritance tables (`vtable`), Go implements interfaces implicitly (duck typing).
You don't write an `implements` keyword. If a concrete type defines the exact method signatures required by an interface, the Go compiler automatically allows the assignment.
To make this implicit matching fast at runtime, Go compiler and runtime manage 2 data structures, `eface` and `iface`.

### Under the Hood

In `src/runtime/runtime2.go`, Go splits interfaces into 2 different structs depending on whether the interface defines methods.

**Empty Interface `eface`**

An `eface` represents the empty interface `interface{}` or the modern alias `any`.
Because it has no methods, any variable can be assigned to it.
```go
type eface struct {
    _type *_type         // Pointer to the underlying concrete type metadata
    data  unsafe.Pointer // Pointer to the actual data value on the heap or stack
}
```

**Non-empty Interface `iface`**

An `iface` represents an interface that explicitly specifies one or more methods, e.g. `io.Reader`.
```go
type iface struct {
    tab  *itab          // The Interface Table (holds type info AND method pointers)
    data unsafe.Pointer // Pointer to the actual concrete value data
}

type itab struct {
    inter *interfaceType // Pointer to the static interface schema description
    _type *_type         // Pointer to the concrete type description
    hash  uint32         // Duplicate of _type.hash, used for fast type assertions
    pad   [4]byte
    fun   [1]uintptr     // Variable-sized array of concrete method function pointers
}
```
When you assign a concrete struct to an interface, the runtime constructs or fetches an `itab`. The magic happens inside the `fun` array.
- The Go compiler sorts methods alphabetically by name for both the interface def and the concrete type def.
- This allows the runtime to map the concrete type's methods to the interface's methods in linear O(N+M) time during instantiation, rather than doing expensive string-based lookups at runtime.
- When you call `reader.Read(buf)`, Go bypasses all reflection. It grabs the func pointer sitting at a fixed offset inside the `fun` array and jumps straight to the compiled assembly execution line.

Generating an `itab` requires some work (sorting, validating signatures, allocating the table).
If Go re-generated an `itab` every time you passes a var to an interface inside a loop, performance would collapse.
To prevent this, the Go runtime maintains a global, lock-free `itab` cache, implemented as a specialized hash map.
- When a concrete type is assigned to an interface, Go hashes the combination of `(interfaceType, concreteType)`.
- It checks the global cache. If that exact pairing has occurred before, it returns the existing `itab` pointer instantly with zero allocation overhead.

**What does "Assign a Concrete Value to an Interface" mean?**

A concrete value is an instance of a real, physical data type that actually holds data, e.g. an `int`, a `string`, or a custom `struct`. They have a fixed size and shape known to the hardware.
"Assigning a concrete value to an interface" means taking one of these physical data objects and stuffing it inside the interface container box .

```go
type Counter struct { val int } // 1. Define a concrete blueprint

c := Counter{val: 5}            // 2. Allocate a concrete object 'c' in memory
                                //    'c' is a physical block of 8 bytes holding the number 5.

var i any                       // 3. Allocate an interface container 'i' (it's currently empty)

i = c                           // 4. "ASSIGN A CONCRETE VALUE TO AN INTERFACE"
```
When `i = c` executes, Go looks at the concrete value `c`, opens up the container box `i` and fills the 2 compartments:
- It writes the type metadata pointer `main.Counter` into the 1st compartment.
- It allocates a brand new piece of memory, copies the data inside `c` into that new memory, and writes that new memory address into the 2nd compartment.

### Compare Java & Go Interfaces

```java
Readable r = new Book();
```
There is only one `Book` object on the heap.
The variable `r` is just a raw memory address pointing to `Book`.
The interface itself has no physical structure holding variable data.

```go
var r io.Reader = Book{}
```
There is the original `Book` struct, and a separate 16-byte `iface` struct container `r` that holds a copy of the `Book`'s data and its method execution pointers.

## 2. What's the difference between `iface` and `eface`?

| Dimension | `eface` | `iface` |
| --- | --- | --- |
| Method Constraints | 0 methods required. | One or more methods required. |
| First Word Pointer | Points directly to a `_type` metadata block. | Points to a complex `itab` execution mapping block. |
| Invocation Mechanism | Cannot invoke methods directly, requires type assertion. | Can invoke methods instantly via the `itab.fun` pointer array. |
| Memory Size | Exactly 2 machine words (16 bytes on 64-bit). | Exactly 2 machine words (16 bytes on 64-bit). |
| Runtime Instantiation | Fast. Just copies the type pointer and data pointer. | Requires creating/fetching an `itab` config from a global cache. |

The `itab` acts as the bridge contract. It contains metadata about the interface itself, metadata about the concrete type, and a highly optimized array of direct function pointers `fun` that match the interface's methods.

```go
package main

type Carrier interface {
	GetID() int
}

type User struct{ id int }
func (u User) GetID() int { return u.id }

func main() {
	u := User{id: 99}

	// 1. COMPILER INJECTS AN eface STRUCTURE HERE
	// Under the hood, 'e' is populated as: eface{ _type: *User, data: *u }
	var e any = u

	// 2. COMPILER INJECTS AN iface STRUCTURE HERE
	// Under the hood, 'i' is populated as: iface{ tab: *itab(Carrier, User), data: *u }
	var i Carrier = u
	
	_ = e
	_ = i
}
```
Why it is `*itab(Carrier, User)`:
1. In Go, we never use a pointer to an interface type like `*Carrier`.
2. In Go, `&` means "take the address of an active **variable instance** on the stack or heap". We cannot take the memory address of a type name itself, e.g. `ptr := &int`.

## 3. What's the difference between type conversion and type assertion?

They both transform a variable from one classification to another.
Type Conversion changes the structural representation of concrete data, whereas Type Assertion unlocks the data hidden inside an interface container.

### Underlying Mechanics

Type conversion is evaluated almost entirely at compile time.
Because different concrete types occupy different amounts of memory space, a type conversion often forces the CPU to generate new underlying assembly instructions to re-align the bit patterns.
- memory impact: It creates a new copy of the data. If you convert a `string` to a `[]byte` slice (`[]byte(myStr)`), Go has to allocate an entirely new memory array and copy the chars over byte-by-byte.
- safety: The compiler strictly enforces rules at compile time. You can only convert types that share an underlying structural compatibility (like numbers to numbers, or defined types to their base types). If they don't match, the code won't compile.
```go
var a int32 = 42
var b int64 = int64(a) // Type Conversion
```

Type assertion is used to inspect the dynamic value stored inside an interface container and extract it.
It's evaluated at runtime. When you execute `i.(string)`, the Go runtime goes to the interface container and performs a quick metadata check: Does the `_type` pointer inside this interface point to the metadata block for a `string`?
- Yes: Go extracts the `data` pointer directly. No memory is re-aligned, and no bytes are copied. It just surfaces the underlying value.
- No: If you used the two-value assignment `s, ok :=`, `ok` becomes `false`. If you used the single-value assignment `s := i.(string)` and the type is wrong, your app will instantly crash with a runtime panic.
```go
var i any = "hello"       // 'i' is an empty interface containing a string
s, ok := i.(string)       // Type Assertion
```

| Feature | Type Conversion | Type Assertion |
| --- | --- | --- |
| Target Variables | Works on concrete types (`int`, `string`, `struct`). | Works exclusively on interfaces. |
| When It's Evaluated | Primarily compile time. | Exclusively runtime. |
| Memory Modification | Can alter bit layout and trigger heavy memory allocations/copies. | Never alters data layout. It merely reveals a pointer already inside the interface. |
| Failure Behavior | Compiler-time error. | Runtime panic. |
| Syntax Style | `Type(var)`, e.g. `float64(int)` | `interface.(Type)`, e.g. `i.(string)` |

## 4. What are the use cases of `interface` in Go?

`eface`:
- generic type containment
- reflection `reflect.TypeOf`
- anywhere you need to pass an arbitrary block of data without compile-time constraints

`iface`:
- polymorphic dispatch
- enabling loose coupling and dynamic method execution at near-native hardware speeds