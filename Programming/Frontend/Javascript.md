---
type: Note
---
# JavaScript

### 1. What is ES6?

ES6 (ECMAScript 2015) is a turning point of JavaScript, bringing significant updates like:
- block scoping: Before ES6, we only have `var`, which is **function-scoped** and prone to hoisting bugs. ES6 introduced `let` and `const`, which are **block-scoped**, i.e. they only exist within the closest `{}`.
- arrow functions: crucial for React components. do not bind their own `this` context, but inherit `this` from the enclosing lexical scope.
- destructuring assignments: unpack values from arrays or properties from objects into distinct variables. used everywhere in React to handle `props` and states.
- template literals: instead of string concatenation using `+`, ES6 introduced backticks and string interpolation via `$`.
- spread and rest operators
- modules (`import` and `export`)
- Promises: handle async operations natively

```javascript
// --- Arrow Functions ---
// regular function
function greet(name) {
    return `Hello, ${name}`;
}

// arrow function
const greet = (name) => `Hello, ${name}`;

// --- Destructuring Assignment ---
const user = { name: 'Alex', age: 28 };
const {name, age} = user; // object destructuring
function Profile({ name, age }) { ... } // in React components

// --- Spread Operator ---
const updatedUser = { ...user, location: 'LA' }; // shallow copy an object to update state
```

### 2. What is Hoisting?

It's a behavior where variable and function declarations are moved to the top of their containing scope (global or function scope) during compile time.
- function declarations are fully hoisted: both the function name and body are loaded into memory before execution. so you can call a function before it's defined in the code.
- `var` declarations are hoisted as `undefined`: only hoist their declarations but not assignments. JS initializes `var` with default value `undefined`.
- `let` and `const`: they are not initialized with a default value. from the start of the block until the variable is declared, it exists in temporal dead zone (TDZ).
Notice: arrow functions are typically assigned to variables, so they follow the hoisting rule of variables, not functions.

```javascript
// --- Function Hoisting ---
greet(); // Output: "Hello!"
function greet() {
  console.log("Hello!");
}

// --- var hoisting ---
console.log(movie); // Output: undefined
var movie = "Inception";
console.log(movie); // Output: "Inception"

// --- let & const hoisting ---
console.log(game); // Uncaught ReferenceError: Cannot access 'game' before initialization
let game = "Elden Ring";

// --- Arrow Function Hoisting ---
// Example 1: Using let/const
sayHi(); // ReferenceError: Cannot access 'sayHi' before initialization
const sayHi = () => console.log("Hi!");

// Example 2: Using var
sayBye(); // TypeError: sayBye is not a function
var sayBye = () => console.log("Bye!");
```

### 3. What are the differences between `var`, `let` and `const`?

| Feature | `var` | `let` | `const` |
| --- | --- | --- | --- |
| Scope | function | block | block |
| Hoisting | initialized as `undefined` | uninitialized (TDZ) | uninitialized (TDZ) |
| Can re-assign? | Y | Y | N |
| Can re-declare? | Y | N | N |
| Must initialized? | N | N | Y |

Notice: `const` makes the variable binding immutable, not the value itself. If you assign an object or an array to a `const`, you can still modify the properties or elements inside that object or array.
```javascript
const user = { name: "Bob" };
user.name = "Alice"; // This works perfectly!
user = { name: "Charlie" }; // TypeError: Assignment to constant variable.
```

### 4. What is the difference between `==` and `===`?

### 5. How does JavaScript compile?

### 6. What does `this` refer to?

### 7. What are JavaScript scopes?

### 8. What is closure in JavaScript?

### 9. What is callback hell?

### 10. What is Promise?

### 11. What are some new features introduced with ES6?

### 12. What is Event Propagation?

### 13. What is `event.preventDefault`?

### 14. Is JavaScript a single or multi-threaded language?

### 15. What is event loop?

### 16. What do call stack and callback queue do?

### 17. How does JavaScript compile?

### 18. What does it mean when we say that JavaScript is a Dynamically Typed Language?

### 19. What are some benefits of using TypeScript?

### 20. What is static type checking?

### 21. What is an Interface in TypeScript?

### 22. What is the difference between type `any` and type `unknown`?