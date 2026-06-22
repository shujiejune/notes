---
_width: wide
type: Topic
---
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

Cost Function: $J(w, b) = \frac{1}{2m}\sum_{i=1}^{m}(\hat{y}^{(i)}-y^{(i)})^2$, where m is the number of training examples

The purpose of linear regression is to find the $w$ or $(w, b)$ to minimize $J(w)$ or $J(w, b)$.
