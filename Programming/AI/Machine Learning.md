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

### Regression with Multiple Input Variables

Cost Function:
$$
J(w, b) = \frac{1}{2m}\sum_{i=1}^{m}(\hat{y}^{(i)}-y^{(i)})^2
$$
where $m$ is the number of training examples.
This formula calculates the squared error of predicted $\hat{y}$ values.

The purpose of linear regression is to find the $w$ or $(w, b)$ to minimize $J(w)$ or $J(w, b)$.

**Gradient Descent Algorithm:**
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
```python
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
w_j = w_j - \alpha\frac{1}{m}\sum_{i=1}^m(f_{\vec{w},b}(\vec{x}^{(i)}) - y^{(i)})x_j^{(i)} \\
b = b - \alpha\frac{1}{m}\sum_{i=1}^m(f_{\vec{w},b}(\vec{x}^{(i)}) - y^{(i)})
$$

**Feature Scaling: Normalization**

2 methods of feature scaling:
- divide by maximum
- [x] mean normalization

Z-score normalization
$$
x_j = \frac{x_j - \mu_j}{sigma_j}
$$
where $\mu_j$ is the mean value, $sigma_j$ is the standard deviation.

**An alternative to gradient descent: normal equation**

It's only for linear regression, can solve $w, b$ without iterations.

Cons:
- doesn't generalize to other learning algorithms
- slow when number of features is large (> 10,000)

### NumPy and Vectorization

#### Data Creation

```python
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
```python
# NumPy routines which allocate memory and fill arrays with value but do not accept shape as input argument
a = np.arange(4.);              print(f"np.arange(4.):     a = {a}, a shape = {a.shape}, a data type = {a.dtype}")
a = np.random.rand(4);          print(f"np.random.rand(4): a = {a}, a shape = {a.shape}, a data type = {a.dtype}")

# Output
# np.arange(4.):     a = [0. 1. 2. 3.], a shape = (4,), a data type = float64
# np.random.rand(4): a = [0.76064616 0.86934718 0.09734216 0.99327398], a shape = (4,), a data type = float64
```

Values can be specified manually as well.
```python
# NumPy routines which allocate memory and fill with user specified values
a = np.array([5,4,3,2]);  print(f"np.array([5,4,3,2]):  a = {a},     a shape = {a.shape}, a data type = {a.dtype}")
a = np.array([5.,4,3,2]); print(f"np.array([5.,4,3,2]): a = {a}, a shape = {a.shape}, a data type = {a.dtype}")

# Output
# np.array([5,4,3,2]):  a = [5 4 3 2],     a shape = (4,), a data type = int64
# np.array([5.,4,3,2]): a = [5. 4. 3. 2.], a shape = (4,), a data type = float64
```

#### Operations on Vectors

**Index:** Referring to an element of an array by its position within the array.
```python
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
```python
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

```python
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

```python
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

```python
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
```python
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
```python
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
```python
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

#### Linear Regression using Scikit-learn

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import SDGRegressor
from sklearn.preprocessing import StandardScaler
from lab_utils_multi import load_house_data
from lab_utils_common import dlc

np.set_printoptions(precision=2)
plt.style.use('./deeplearning.mplstyle')

# Load the data set
X_train, y_train = load_house_data()
X_features = ['size(sqft)','bedrooms','floors','age']

# Normalize the training data
scaler = StandardScaler()
X_norm = scaler.fit_transform(X_train)
print(f"Peak to Peak range by column in Raw        X:{np.ptp(X_train,axis=0)}")
print(f"Peak to Peak range by column in Normalized X:{np.ptp(X_norm,axis=0)}")

# Create and fit the regression model
sgdr = SGDRegressor(max_iter=1000)
sgdr.fit(X_norm, y_train)
print(sgdr)
print(f"number of iterations completed: {sgdr.n_iter_}, number of weight updates: {sgdr.t_}")

# View parameters
b_norm = sgdr.intercept_
w_norm = sgdr.coef_
print(f"model parameters:                   w: {w_norm}, b:{b_norm}")
print( "model parameters from previous lab: w: [110.56 -21.27 -32.71 -37.97], b: 363.16")

# Make a prediction using sgdr.predict()
y_pred_sgd = sgdr.predict(X_norm)
# Make a prediction using w, b
y_pred = np.dot(X_norm, w_norm) + b_norm
print(f"prediction using np.dot() and sgdr.predict match: {(y_pred == y_pred_sgd).all()}")

print(f"Prediction on training set:\n{y_pred[:4]}" )
print(f"Target values \n{y_train[:4]}")

# Plot predictions and targets vs original features
fig,ax=plt.subplots(1,4,figsize=(12,3),sharey=True)
for i in range(len(ax)):
    ax[i].scatter(X_train[:,i],y_train, label = 'target')
    ax[i].set_xlabel(X_features[i])
    ax[i].scatter(X_train[:,i],y_pred,color=dlc["dlorange"], label = 'predict')
ax[0].set_ylabel("Price"); ax[0].legend();
fig.suptitle("target versus prediction using z-score normalized model")
plt.show()
```

## Classification with Logistic Regression

**Sigmoid function (logistic function)**

$$
g(z) = \frac{1}{1+{\rm e}^{-z}}   0\lt g(z)\lt 1
$$

**Logistic regression** combines linear regression formula with sigmoid function:
$$
f_{\vec{w},b}(\vec{x}) = g(\vec{w}\cdot\vec{x} + b)
$$

How to interpret the logistic regression output:
Take $f_{\vec{w},b}(\vec{x})$ as the probability of $y$ being equal to 1, given a certain input $\vec{x}$.
We can use this notation:
$$
f_{\vec{w},b}(\vec{x}) = {\rm P}(y=1\mid\vec{x};\vec{w},b)
$$
It's the probability that $y = 1$, given input $\vec{x}$ and parameters $\vec{w}, b$.

If you set the threshold to be 0.5:
when $f_{\vec{w},b}(\vec{x}) \gt 0.5$, we have $\hat{y}=1$, otherwise $\hat{y}=0$.
In this case, the threshold becomes:
when $\vec{w}\cdot\vec{x} + b \geq 0$, $\hat{y}=1$;
otherwise, $\hat{y}=0$.
We call $\vec{w}\cdot\vec{x} + b = 0$ the **decision boundary**.

The **decision boundary** can be non-linear (for polynomial cost function) and very complex.

### Cost Function for Logistic Regression

Since $y$ in logistic regression is either 0 or 1, the squared error cost function is non-convex.
If you try to use gradient descent, there will be lots of local minima, therefor it's not suitable.

We can change the squared error cost function a bit:
$$
J(\vec{w},b) = \frac{1}{m}\sum_{i=1}^m\frac{1}{2}(f_{\vec{w},b}(\vec{x}^{(i)}) - y^{(i)})^2  \\
\Downarrow  \\
J(\vec{w},b) = \frac{1}{m}\sum_{i=1}^m L(f_{\vec{w},b}(\vec{x}^{(i)}), y^{(i)})
$$
$L(f_{\vec{w},b}(\vec{x}^{(i)}), y^{(i)})$ is called **loss function**.
Loss function measures how well you are doing on one training example.
Cost function measures how well you are doing on the entire training set by summing up the losses on all of the training examples (and averaging them).

The definition usually used for logistic loss function:
$$
L(f_{\vec{w},b}(\vec{x}^{(i)}), y^{(i)}) = \begin{cases} -\log(f_{\vec{w},b}(\vec{x}^{(i)})), & \text {if $y^{(i)}=1$} \\
-\log(1-f_{\vec{w},b}(\vec{x}^{(i)})), & \text {if $y^{(i)}=0$} \end{cases}
$$

It can be simplified like this (equivalent):
$$
L(f_{\vec{w},b}(\vec{x}^{(i)}), y^{(i)}) = -y^{(i)}\log(f_{\vec{w},b}(\vec{x}^{(i)})) - (1-y^{(i)})\log(1-f_{\vec{w},b}(\vec{x}^{(i)}))
$$
Then the simplified cost function looks like:
$$
J(\vec{w},b)=-\frac{1}{m}\sum_{i=1}^m[y^{(i)}\log(f_{\vec{w},b}(\vec{x}^{(i)})) + (1-y^{(i)})\log(1-f_{\vec{w},b}(\vec{x}^{(i)}))]
$$
This particular cost function was derived using a statistical principle called **maximum likelihood estimation**.

#### Logistic Regression using Scikit-learn

```python
import numpy as np
from sklearn.linear_model import LogisticRegression

X = np.array([[0.5, 1.5], [1,1], [1.5, 0.5], [3, 0.5], [2, 2], [1, 2.5]])
y = np.array([0, 0, 0, 1, 1, 1])

lr_model = LogisticRegression()
lr_model.fit(X, y)

y_pred = lr_model.predict(X)
print("Prediction on training set:", y_pred)
print("Accuracy on training set:", lr_model.score(X, y))
```

### Overfitting

**Underfitting (high bias)**: the model cannot fit the training data well.
**Overfitting (high variance)**: the model fits the training data well but does not work well with new data.

How to address overfitting:
- collect more training examples
- try with fewer features
  - disadvantage: the algorithm is throwing away some of the info you have
- regularization: reduce size of parameters (make them ~0)

Regularization adds a term to the original cost function:

$$
J(\vec{w}, b) = \frac{1}{2m}\sum_{i=1}^m(f_{\vec{w},b}(\vec{x}^{(i)})-y^{(i)})^2 + \frac{\lambda}{2m}\sum_{j=1}^n w_j^2
$$

With this modified cost function, you could penalize the model if $w_j$ is large.
This cost function trades off 2 goals:
- trying to minimize the first term (original cost function) encourages the algorithm to fit the training data well.
- trying to minimize the second term (regularization) keeps $w_j$ small, which reduces overfitting.
The value of $\lambda$ specifies the relative importance of these 2 goals.

Regularization modifies the gradient descent algorithm:
- linear regression: Add a $\frac{\lambda}{m}w_j$ to $w_j$. No need to change $b$.
- logistic regression: the formula for updating $w_j$ is the same as linear regression.

$$
w_j = w_j - \alpha[\frac{1}{m}\sum_{i=1}^m(f_{\vec{w},b}(\vec{x}^{(i)}) - y^{(i)})x_j^{(i)} + \frac{\lambda}{m}w_j] \\
b = b - \alpha\frac{1}{m}\sum_{i=1}^m(f_{\vec{w},b}(\vec{x}^{(i)}) - y^{(i)})
$$

## Advanced Learning Algorithms

The artificial neural network uses a very simplified mathematical model of what a biological neuron does.

Activation: (comes from biological neurons) the degree that the biological neuron is sending a high output value to downstream neurons.

$$
a_j^{[l]} = g(\vec{w}_j^{[l]}\cdot\vec{a}^{[l-1]} + b_j^{[l]})
$$

(Denote `\vec{x} = \vec{a}^{[0]}` for convenience.)

Questions to ask for neural network architecture:

- how many hidden layers
- how many neurons on each hidden layer

Propagating the activations of neurons is called **forward propagation**.

Implement a logistic neuron by adding a sigmoid activation:

```python
import tensorflow as tf
from tensorflow.keras import Sequential

# Creates a Tensowflow model that contains the logistic layer
model = Sequential(
  [
    tf.keras.layers.Dense(1, input_dim=1, activation='sigmoid', name='L1')
  ]
)

# Shows the layers and number of parameters in the model
model.summary()

logistic_layer = model.get_layer('L1')
w, b = logistic_layer.get_weights()
print(w, b)
print(w.shape, b.shape)
```
