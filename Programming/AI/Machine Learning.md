# Machine Learning

Machine Learning: field of study that gives computer the ability to learn without being explicitly programmed.

- supervised learning: algorithms that learn input to outout mappings from given examples
  - regression
  - classification
- unsupervised learning: algorithm has to find structure in the data
  - clustering: group similar data points together
  - anomaly detection: find unusual data points
  - dimensionality reduction: compressing data using fewer numbers
- recommender systems
- reinforcement learning

## Supervised machine learning: regression and classification

Cost Function:
$$
J(w, b) = \frac{1}{2m}\sum_{i=1}^{m}(\hat{y}^{(i)}-y^{(i)})^2
$$
where $m$ is the number of training examples.

The purpose of linear regression is to find the $w$ or $(w, b)$ to minimize $J(w)$ or $J(w, b)$.

Gradient Descent Algorithm:
$$
w = w - \alpha\frac{\partial J(w, b)}{\partial w} \\
b = b - \alpha\frac{\partial J(w, b)}{\partial b}
$$
where $\alpha$ is the **learning rate**, usually a small positive number between 0 and 1.

Say we have multiple features.
$x_j$ is the j-th feature;
$n$ is the number of features;
$\vec{x}^{(i)}$ is the vector representing features of i-th training example; and
$x_j^{(i)}$ is the value of feature j in i-th training example.

Then the model can be written as:
$$
f_{\vec{w},b}(\vec{x}) = \vec{w}\cdot\vec{x} + b
$$
This is multiple linear regression.

Implement it in Python code (NumPy):
```py
w = np.array([1.0, 2.5, -3.3])
b = 4
x = np.array([10, 20, 30])

# Without vectorization
f = 0
for j in range(n):
  f = f + w[j] * x[j]
f = f + b

# With vectorization
f = np.dot(w, x) + b
```
Vectorization is much faster because NumPy implements it in hardware, multiplying each $w[j]$ and $x[j]$ pair at the same time in parallel.

For multiple linear regression, gradient descent formulae become:
$$
w_j = w_j - \alpha\frac{1}{m}\Sum_{i=1}^m(f_{\vec{w},b}(\vec{x}^{(i)}) - y^{(i)})x_j^{(i)}
b = b - \alpha\frac{1}{m}\Sum_{i=1}^m(f_{\vec{w},b}(\vec{x}^{(i)}) - y^{(i)})
$$

### NumPy and Vectorization

#### Data Creation

```py
# NumPy routines which allocate memory and fill arrays with value
a = np.zeros(4);                print(f"np.zeros(4) :   a = {a}, a shape = {a.shape}, a data type = {a.dtype}")
a = np.zeros((4,));             print(f"np.zeros(4,) :  a = {a}, a shape = {a.shape}, a data type = {a.dtype}")
a = np.random.random_sample(4); print(f"np.random.random_sample(4): a = {a}, a shape = {a.shape}, a data type = {a.dtype}")

# Output
# np.zeros(4) :   a = [0. 0. 0. 0.], a shape = (4,), a data type = float64
# np.zeros(4,) :  a = [0. 0. 0. 0.], a shape = (4,), a data type = float64
# np.random.random_sample(4): a = [0.33255209 0.24619861 0.10751594 0.5342993 ], a shape = (4,), a data type = float64
```
Data creation routine in NumPy will have a first param which is the shape of the object.
This can either be a single value for a 1-D result or a tuple (n, m, ...) specifying the shape of the result.

There are some data creation routines that do not take a shape tuple.
```py
# NumPy routines which allocate memory and fill arrays with value but do not accept shape as input argument
a = np.arange(4.);              print(f"np.arange(4.):     a = {a}, a shape = {a.shape}, a data type = {a.dtype}")
a = np.random.rand(4);          print(f"np.random.rand(4): a = {a}, a shape = {a.shape}, a data type = {a.dtype}")

# Output
# np.arange(4.):     a = [0. 1. 2. 3.], a shape = (4,), a data type = float64
# np.random.rand(4): a = [0.76064616 0.86934718 0.09734216 0.99327398], a shape = (4,), a data type = float64
```

Values can be specified manually as well.
```py
# NumPy routines which allocate memory and fill with user specified values
a = np.array([5,4,3,2]);  print(f"np.array([5,4,3,2]):  a = {a},     a shape = {a.shape}, a data type = {a.dtype}")
a = np.array([5.,4,3,2]); print(f"np.array([5.,4,3,2]): a = {a}, a shape = {a.shape}, a data type = {a.dtype}")

# Output
# np.array([5,4,3,2]):  a = [5 4 3 2],     a shape = (4,), a data type = int64
# np.array([5.,4,3,2]): a = [5. 4. 3. 2.], a shape = (4,), a data type = float64
```

#### Operations on Vectors

**Index:** Referring to an element of an array by its position within the array.
```py
# vector indexing operations on 1-D vectors
a = np.arange(10)
print(a)
# [0 1 2 3 4 5 6 7 8 9]

# access an element
print(f"a[2].shape: {a[2].shape} a[2]  = {a[2]}, Accessing an element returns a scalar")
# a[2].shape: () a[2]  = 2, Accessing an element returns a scalar

# access the last element, negative indexes count from the end
print(f"a[-1] = {a[-1]}")
# a[-1] = 9

# indices must be within the range of the vector or they will produce and error
try:
    c = a[10]
except Exception as e:
    print("The error message you'll see is:")
    print(e)
# The error message you'll see is:
# index 10 is out of bounds for axis 0 with size 10
```

**Slicing:** Getting a subset of elements from an array based on their indices.
It creates an array of indices using a set of 3 values `start:stop:step`.
```py
# vector slicing operations
a = np.arange(10)
print(f"a         = {a}")
# a         = [0 1 2 3 4 5 6 7 8 9]

# access 5 consecutive elements (start:stop:step)
c = a[2:7:1];     print("a[2:7:1] = ", c)
# a[2:7:1] =  [2 3 4 5 6]

# access 3 elements separated by two
c = a[2:7:2];     print("a[2:7:2] = ", c)
# a[2:7:2] =  [2 4 6]

# access all elements index 3 and above
c = a[3:];        print("a[3:]    = ", c)
# a[3:]    =  [3 4 5 6 7 8 9]

# access all elements below index 3
c = a[:3];        print("a[:3]    = ", c)
# a[:3]    =  [0 1 2]

# access all elements
c = a[:];         print("a[:]     = ", c)
# a[:]     =  [0 1 2 3 4 5 6 7 8 9]
```

**Single vector operations**

```py
a = np.array([1,2,3,4])
print(f"a             : {a}")
# a             : [1 2 3 4]

# negate elements of a
b = -a
print(f"b = -a        : {b}")
# b = -a        : [-1 -2 -3 -4]

# sum all elements of a, returns a scalar
b = np.sum(a)
print(f"b = np.sum(a) : {b}")
# b = np.sum(a) : 10

b = np.mean(a)
print(f"b = np.mean(a): {b}")
# b = np.mean(a): 2.5

b = a**2
print(f"b = a**2      : {b}")
# b = a**2      : [1 4 9 16]
```

**Vector element-wise operations**

```py
a = np.array([ 1, 2, 3, 4])
b = np.array([-1,-2, 3, 4])
print(f"Binary operators work element wise: {a + b}")
# Binary operators work element wise: [0 0 6 8]

# For this to work correctly, the vectors must be of the same size
# try a mismatched vector operation
c = np.array([1, 2])
try:
    d = a + c
except Exception as e:
    print("The error message you'll see is:")
    print(e)
# The error message you'll see is:
# operands could not be broadcast together with shapes (4,) (2,)
```

**Vector dot product**

```py
# test 1-D
a = np.array([1, 2, 3, 4])
b = np.array([-1, 4, 3, 2])
c = np.dot(a, b)
print(f"NumPy 1-D np.dot(a, b) = {c}, np.dot(a, b).shape = {c.shape} ")
c = np.dot(b, a)
# NumPy 1-D np.dot(a, b) = 24, np.dot(a, b).shape = ()
print(f"NumPy 1-D np.dot(b, a) = {c}, np.dot(a, b).shape = {c.shape} ")
# NumPy 1-D np.dot(b, a) = 24, np.dot(a, b).shape = ()
```

#### Matrix Creation

The same functions that created 1-D vectors will create n-D arrays.
```py
a = np.zeros((1, 5))
print(f"a shape = {a.shape}, a = {a}")
# a shape = (1, 5), a = [[0. 0. 0. 0. 0.]]

a = np.zeros((2, 1))
print(f"a shape = {a.shape}, a = {a}")
# a shape = (2, 1), a = [[0.] [0.]]

a = np.random.random_sample((1, 1))
print(f"a shape = {a.shape}, a = {a}")
# a shape = (1, 1), a = [[0.44236513]]
```

One can also manually specify data.
```py
# NumPy routines which allocate memory and fill with user specified values
a = np.array([[5], [4], [3]]);   print(f" a shape = {a.shape}, np.array: a = {a}")
# a shape = (3, 1), np.array: a = [[5] [4] [3]]

a = np.array([[5],   # One can also
              [4],   # separate values
              [3]]); #into separate rows
print(f" a shape = {a.shape}, np.array: a = {a}")
# a shape = (3, 1), np.array: a = [[5] [4] [3]]
```

#### Matrix Operations

**Indexing:** Matrices include a second index. The 2 indices describe `[row, column]`.
```py
# vector indexing operations on matrices
a = np.arange(6).reshape(-1, 2)   # reshape is a convenient way to create matrices
print(f"a.shape: {a.shape}, \na= {a}")
# a.shape: (3, 2), a= [[0 1] [2 3] [4 5]]

# access an element
print(f"\na[2,0].shape:   {a[2, 0].shape}, a[2,0] = {a[2, 0]},     type(a[2,0]) = {type(a[2, 0])} Accessing an element returns a scalar\n")
# a[2,0].shape:   (), a[2,0] = 4,     type(a[2,0]) = <class 'numpy.int64'> Accessing an element returns a scalar

# access a row
print(f"a[2].shape:   {a[2].shape}, a[2]   = {a[2]}, type(a[2])   = {type(a[2])}")
# a[2].shape:   (2,), a[2]   = [4 5], type(a[2])   = <class 'numpy.ndarray'>
```
We can also create a same 2-D array using `.reshape(3, 2)`.
The `-1` argument tells the routine to compute the number of rows given the size of the array and the number of columns.

**Slicing:** `start:stop:step` can be applied to both rows and columns.
