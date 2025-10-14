#!/usr/bin/env python3
import hashlib, math
import numpy as np

def _hash_scalar(s):
    d = hashlib.sha256(s.encode("ascii")).digest()
    return int.from_bytes(d[:8], "big", signed=False) / (2**64 - 1)

def _probe(names):
    g = np.array([_hash_scalar(n) for n in names], dtype=float)
    g = g - g.mean()
    n = np.linalg.norm(g)
    return g / n if n > 0 else np.full(len(names), 1.0/len(names))

def deterministic_rotate_first_snapshot(X, names):
    g = _probe(names)
    a = X.T @ g
    a_norm = float(np.linalg.norm(a))
    if a_norm < 1e-15:
        a = X.T @ _probe(list(reversed(names)))
        a_norm = float(np.linalg.norm(a))
        if a_norm < 1e-15:
            Y = X.copy()
            Y[np.abs(Y) < 1e-12] = 0.0
            return Y
    ax, ay = (a / a_norm)
    theta = math.atan2(ay, ax)
    c, s = math.cos(-theta), math.sin(-theta)
    R = np.array([[c, -s],[s, c]])
    Y = X @ R
    b = (Y.T @ (np.arange(X.shape[0]) - (X.shape[0]-1)/2.0))
    if b[1] < 0:
        Y[:,1] *= -1.0
    Y[np.abs(Y) < 1e-12] = 0.0
    return Y
