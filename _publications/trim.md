---
title: "TRIM: Achieving Extreme Sparsity with Targeted Row-wise Iterative Metric-driven Pruning"
collection: publications
category: conferences
excerpt: "Large Language Models (LLMs) present significant computational and memory challenges due to their extensive size, making pruning essential for their efficient deployment. Existing one-shot pruning methods often apply uniform sparsity constraints across layers or within each layer, resulting in suboptimal performance, especially at high sparsity ratios. This work introduces TRIM (Targeted Row-wise Iterative Metric-driven pruning), a novel approach that applies varying sparsity ratios to individual output dimensions (rows) within each layer. TRIM employs an iterative adjustment process guided by quality metrics to optimize dimension-wise sparsity allocation, focusing on reducing variance in quality retention across outputs to preserve critical information. TRIM can be seamlessly integrated with existing layer-wise pruning strategies. Our evaluations on perplexity and zero-shot tasks across diverse LLM families (Qwen2.5, LLaMA-2, and OPT) and sparsity levels demonstrate that TRIM achieves new state-of-the-art results and enhances stability. For instance, at 80% sparsity, TRIM reduces perplexity by 48% for Qwen2.5-14B and over 90% for OPT-13B compared to baseline methods. We conclude that fine-grained, dimension-wise sparsity adaptation is crucial for pushing the limits of extreme LLM compression."
date: 2025-11-11
venue: 'Under Review at EACL'
paperurl: 'https://arxiv.org/abs/2505.16743'
---
