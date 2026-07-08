import numpy as np
import matplotlib.pyplot as plt
from utils import *
import copy
import math

# load the dataset
# x_train is the population of a city
# y_train is the profit of a restaurant in the city
x_train, y_train = load_data()

# print x_train
print("Type of x_train:", type(x_train))
print("First five elements of x_train are:\n", x_train[:5])

# print y_train
print("Type of y_train:",type(y_train))
print("First five elements of y_train are:\n", y_train[:5])

# print the shape of x_train and y_train
print("The shape of x_train is:", x_train.shape)
print("The shape of y_train is:", y_train.shape)
print("Number of training examples (m):", len(x_train))

# visualize the data

# create a scatter plot of the data
# change the markers to red
plt.scatter(x_train, y_train, marker='x', c='r')
# set the title
plt.title("Profits vs. Population per city")
# set the axis labels
plt.ylabel("Profit in $10,000")
plt.xlabel("Population of City in 10,000s")
plt.show()

def compute_cost(x, y, w, b):
    """
    Computes the cost function for linear regression.

    Args:
        x (ndarray): Shape(m,) Input to the model (Population of cities)
        y (ndarray): Shape(m,) Label (Actual profits for the cities)
        w, b (scalar): Parameters of the model

    Returns
        total_cost (float): The cost of using w, b as the parameters for
        linear regression to fit the data points in x and y.
    """
    # number of the training examples
    m = x.shape[0]

    total_cost = 0

    for i in range(m):
        f_wb = w * x[i] + b
        err = f_wb - y[i]
        total_cost += err ** 2

    total_cost /= (2 * m)

    return total_cost

# check if compute_cost is correctly implemented
initial_w = 2
initial_b = 1

cost = compute_cost(x_train, y_train, initial_w, initial_b)
print(type(cost))
print(f"Cost at initial w: {cost:.3f}")

def compute_gradient(x, y, w, b):
    """
    Computes the gradient for linear regression

    Args:
        x (ndarray): Shape(m,) Input to the model (Population of cities)
        y (ndarray): Shape(m,) Label (Actual profits for the cities)
        w, b (scalar): Parameters of the model

    Returns
        dj_dw (scalar): The gradient of the cost w.r.t. the parameters w
        dj_db (scalar): The gradient of the cost w.r.t. the parameter b
    """
    m = x.shape[0]

    dj_dw = 0
    dj_db = 0

    for i in range(m):
        f_wb = w * x[i] + b
        err = f_wb - y[i]
        dj_dw += err * x[i]
        dj_db += err

    dj_dw /= m
    dj_db /= m

    return dj_dw, dj_db

# check if compute_gradient is correctly implemented
initial_w = 0
initial_b = 0

tmp_dj_dw, tmp_dj_db = compute_gradient(x_train, y_train, initial_w, initial_b)
print('Gradient at initial w, b (zeros):', tmp_dj_dw, tmp_dj_db)

# compute_gradient_test(compute_gradient)

def gradient_descent(x, y, w_in, b_in, cost_function, gradient_function, alpha, num_iters):
    """
    Performs batch gradient descent to learn theta. Updates theta by taking
    num_iters gradient steps with learning rate alpha

    Args:
        x :    (ndarray): Shape (m,)
        y :    (ndarray): Shape (m,)
        w_in, b_in : (scalar) Initial values of parameters of the model
        cost_function: function to compute cost
        gradient_function: function to compute the gradient
        alpha : (float) Learning rate
        num_iters : (int) number of iterations to run gradient descent
    Returns
        w : (ndarray): Shape (1,) Updated values of parameters of the model after
          running gradient descent
        b : (scalar)              Updated value of parameter of the model after
          running gradient descent
    """

    # An array to store cost J and w's at each iteration — primarily for graphing later
    J_history = []
    w_history = []
    w = copy.deepcopy(w_in)  #avoid modifying global w within function
    b = b_in

    for i in range(num_iters):

        # Calculate the gradient and update the parameters
        dj_dw, dj_db = gradient_function(x, y, w, b)

        # Update Parameters using w, b, alpha and gradient
        w = w - alpha * dj_dw
        b = b - alpha * dj_db

        # Save cost J at each iteration
        if i<100000:      # prevent resource exhaustion
            cost =  cost_function(x, y, w, b)
            J_history.append(cost)

        # Print cost every at intervals 10 times or as many iterations if < 10
        if i % math.ceil(num_iters/10) == 0:
            w_history.append(w)
            print(f"Iteration {i:4}: Cost {float(J_history[-1]):8.2f}   ")

    return w, b, J_history, w_history #return w and J,w history for graphing

# run gradient descent algorithm to learn the parameters for the dataset
initial_w = 0.
initial_b = 0.

# some gradient descent settings
iterations = 1500
alpha = 0.01

w,b,_,_ = gradient_descent(x_train ,y_train, initial_w, initial_b,
                     compute_cost, compute_gradient, alpha, iterations)
print("w,b found by gradient descent:", w, b)

# use the final parameters from gradient descent to plot the linear fit
m = x_train.shape[0]
predicted = np.zeros(m)

for i in range(m):
    predicted[i] = w * x_train[i] + b

# Plot the linear fit
plt.plot(x_train, predicted, c = "b")

# Create a scatter plot of the data.
plt.scatter(x_train, y_train, marker='x', c='r')

# Set the title
plt.title("Profits vs. Population per city")
# Set the y-axis label
plt.ylabel('Profit in $10,000')
# Set the x-axis label
plt.xlabel('Population of City in 10,000s')

predict1 = 3.5 * w + b
print('For population = 35,000, we predict a profit of $%.2f' % (predict1*10000))

predict2 = 7.0 * w + b
print('For population = 70,000, we predict a profit of $%.2f' % (predict2*10000))
