# Reflection

## 1. What is reflection?

Reflection is the ability of a program to examine, introspect, and modify its own structure and behavior at runtime.
When you compile a program, your code is turned into raw, anonymous machine code. Reflection allows a program to look into a mirror at runtime and ask: What am I? What fields do I have? What methods do I call?

We use reflection to build highly dynamic, generalized tools that must handle data types that did not exist when the tool itself was written.

## 2. How does Go implement reflection?

Reflection is the process of unpacking the interface container.
In Go, the `reflect` package provides 2 primary entry points that map to the type and value pointer compartments:
- `reflect.TypeOf(i any)`: Interrogates the interfae's type compartment and returns a `reflect.Type` descriptor object (revealing the name, package, kind, and structural fields).
- `reflect.ValueOf(i any)`: Interrogates the data compartment and returns a `reflect.Value` object containing the actual hardware payload, allowing you to read or mutate it.

```go
package main

import (
	"fmt"
	"reflect"
)

type Account struct {
	Username string `db:"user_name"`
	Balance  int    `db:"account_balance"`
}

func main() {
	acc := Account{Username: "Alice", Balance: 500}

	// 1. Pass the struct to an empty interface to capture its runtime metadata
	t := reflect.TypeOf(acc)
	v := reflect.ValueOf(acc)

	fmt.Println("Dynamic Type Kind:", t.Kind()) // Output: struct

	// 2. Iterate over the struct fields dynamically
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)      // Get the field structural description
		value := v.Field(i)      // Get the actual data value inside that field
		tag := field.Tag.Get("db") // Extract the metadata tag string

		fmt.Printf("Field Name: %s | Type: %s | Value: %v | DB Tag: %s\n",
			field.Name, field.Type, value.Interface(), tag)
	}
}
```

## 3. What are the use cases of reflection?

Production Examples:
- JSON serialization/deserialization (`json.Unmarshal`): The standard library parser doesn't know what custom structs you will create in your app. It uses reflection to scan your struct fields at runtime, read the custom `json:"user_id"` metadata tags, and map incoming JSON keys to your variables.
- db ORMs (object-relational mapping): Tools like GORM use reflection to inspect a struct, deduce table columns from the field names, and dynamically generate SQL strings on the fly.
- generaic test frameworks: Deep equality checkers like `reflect.DeepEqual` use reflection to recursively walk down nested objects, arrays, and maps of any arbitrary type to verify they are identical.

## 4. How to compare two objects to see if they are identical?

### The strict `==` operator

It's built into the Go compiler.
It's blazingly fast because it translates down to a single hardware CPU comparison instruction.
However, it can only be used on types that Go classifies as comparable:
- primitives: `int`, `float`, `string`, `bool`.
- pointers: compares whether 2 pointers look at the exact same memory address.
- structs (with restrictions): compares 2 structs field by field, but only if every single field inside that struct is also comparable.
- arrays: compares elements sequentially, but only if the array element type is comparable.

What cannot be compared with `==`: slices, maps, functions (except comparing them to `nil`).
Because maps and slices are pointer-backed headers. If `==` compared their pointer headers, it could return `true` even if the elements inside them were different. If it recursively scanned the items, a `==` operation could suddenly freeze a thread if a map contained millions of items.
Go forces you to handle this explicitly to prevent silent performance traps.

### The universal heavy `reflect.DeepEqual`

When you need to compare complex, nested objects containing slices, maps, custom structs, or pointers where you want to verify that the inner data values are identical, you must use `reflect.DeepEqual`.
```go
import "reflect"

areIdentical := reflect.DeepEqual(objectA, objectB)
```

**Under the Hood**

`reflect.DeepEqual` uses recursion to walk through both objects simultaneously, peeling back their internal structures based on tehir reflection type metadata.
- slices / arrays: checks if they have the same length, and then verifies that every element at index `i` is deeply equal.
- maps: checks if they have the exact same set of keys, and that the values mapped to those keys are deeply equal.
- pointers / interfaces: unwraps the pointers and compares the actual data values they point to, rather than just checking if their memory addresses match.

**Trade-off: Compile vs. Runtime**

`reflect.DeepEqual` is slow compared to a manual `==` operation.
Because it must use reflection to inspect unexported metadata types, allocate tracking layers on the heap to detect recursive pointer loops (to prevent infinite loops if an object points to itself), and perform hundreds of dynamic interface inspections. It can easily run 100x to 1000x slower than compiled code.

```go
package main

import (
	"fmt"
	"reflect"
)

type User struct {
	Name  string
	Tags  []string // ◄── WARNING: Slice makes this struct UNCOMPARABLE via ==
}

type SimpleUser struct {
	Name string
	Age  int      // ◄── Every field is comparable!
}

func main() {
	// ==========================================
	// CASE A: Comparable Structs (The Fast Path)
	// ==========================================
	u1 := SimpleUser{Name: "Alice", Age: 30}
	u2 := SimpleUser{Name: "Alice", Age: 30}
	
	fmt.Println("Simple Struct (==):", u1 == u2) // Output: true (Fast, compile-time)

	// ==========================================
	// CASE B: Non-Comparable Structs (Slices/Maps)
	// ==========================================
	userA := User{Name: "Bob", Tags: []string{"admin", "dev"}}
	userB := User{Name: "Bob", Tags: []string{"admin", "dev"}}

	// fmt.Println(userA == userB)
	// ❌ COMPILE ERROR: invalid operation: userA == userB (struct containing []string cannot be compared)

	// DeepEqual inspects the elements inside the tags slices recursively
	fmt.Println("Deep Object Equal:", reflect.DeepEqual(userA, userB)) // Output: true

	// ==========================================
	// CASE C: Pointer Address vs. Pointer Value
	// ==========================================
	valA, valB := 42, 42
	p1 := &valA
	p2 := &valB

	fmt.Println("Pointer == (Compares Memory Address):", p1 == p2)       // Output: false (Different locations)
	fmt.Println("Pointer DeepEqual (Compares Values):", reflect.DeepEqual(p1, p2)) // Output: true  (Both point to 42)
}
```

If you are writing high-throughput backend pathways, never use `reflect.DeepEqual` in loop backs.
Instead, implement a custom `Equal()` method directly on your struct. This gives you the value depth of `DeepEqual` with the native runtime speeds of `==`.
```go
func (u User) Equal(other User) bool {
    if u.Name != other.Name || len(u.Tags) != len(other.Tags) {
        return false
    }
    for i := range u.Tags {
        if u.Tags[i] != other.Tags[i] {
            return false
        }
    }
    return true
}
```