---
title: 'Stanford CS336: Language Modeling from Scratch'
description: 'Notes on building language models from scratch: tokenization, architecture, and training.'
pubDate: 2026-08-05
tags: ['ai', 'llm', 'stanford cs336']
---
# Stanford CS336: Language Modeling from Scratch

## Basic Architecture

### Tokenization

Q: What are the atoms that the model operates on?
A: A tokenizer converts between raw inputs (bytes) and sequences of integers (tokens).

Popular tokenizer: Byte-Pair Encoding (BPE), which breaks input into frequency-occurring chunks.

Why does tokenizer add to efficiency:

- Reduce context length (1000 bytes -> ~250 tokens)
- adaptive computation (more modeling capacity on interesting parts of input)

Raw text is generally represented as Unicode strings.
A language model places a probability distribution over sequences of tokens (usually represented to indices).
So we need a procedure that **encodes** strings into tokens, and a procedure that **decodes** tokens back into strings.
A **Tokenizer** is a class that implements the encode and decode methods.

Observations:

- a word and its preceding space are part of the same token, e.g. " world".
- a word at the beginning and in the middle are represented differently, e.g. "hello hello", the 2 hellos have different indices.
- numbers are tokenized into every few digits.

Compression ratio: number of bytes per token
The larger the compression ratio, the shorter the sequence, which is good since attention is quadratic in sequence length.
One could increase compression ratio by increasing vocabulary size (number of possible token value increases), leading to sparsity.

#### Byte Pair Encoding (BPE)

Basic idea: train the tokenizer on raw text to construct a vocabulary tailored to the data.
Intuition: common sequences of bytes are represented by a single token, rare sequences are represented by many tokens.
Sketch: start with each byte as a token, and successively merge the most common pair of adjacent tokens.

#### Summary

- tokenizer: strings <-> tokens (indices)
- character-based, byte-based,word-based tokenization are highly suboptimal
- BPE is an effective heuristic that is data-driven
- tokenization is a separate step, maybe one day do it end-to-end from bytes, but whatever solution needs to satisfy:
  - model (e.g. transformer) should operate on chunks (abstractions) of the sequence (text, video, DNA, etc.)
  - chunks should be variable (allocate more model capacity to interesting chunks)

### Transformer

Refinements on the transformer:

- activation functions: ReLU, SwiGLU
- positional encodings: sinusoidal, RoPE
- normalization: LayerNorm, RMSNorm, QK norm, pre-norm versus post-norm
- attention: full, sparse/local attention, group-query attention (GQA), multi-head latent attention
- recurrence/state-space models/linear attention: Mamba, Gated DeltaNet
- MLP: dense, mixture of experts
- Shape (hidden dimension, depth, number of heads, number of experts)

### Training

How do you set the parameters of the model?

- loss function, e.g. multi-token prediction
- optimizer, e.g. AdamW, SOAP, Muon
- initialization scale, e.g. Xaver init, muP
- learning rate schedule, e.g. cosine, WSD
- regularization, e.g. dropout, weight decay
- batch size, e.g. critical batch size
- MoE specific: load balancing, e.g. aux-free

High-level principle: everything is about balancing the following

- expressivity: can represent complex dependencies in the data
- stability: keep parameter and gradient norms in goldilocks zone
- efficiency: runs fast on hardware, both training and inference

