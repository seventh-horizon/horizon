import numpy as np
from .mds_tie_break import deterministic_rotate_first_snapshot
from .constants import EPS

def _err_scaled(Z, prev):
    denom = float((Z * Z).sum()) or 1.0
    s = float((Z * prev).sum()) / denom
    if s < 0: s = -s
    return float(((s * Z - prev) ** 2).sum())

def _double_center(D):
    n = D.shape[0]
    J = np.eye(n) - np.ones((n, n))/n
    return -0.5 * J @ (D**2) @ J

def _sign_fix(X):
    Y = X.copy()
    for j in range(Y.shape[1]):
        col = Y[:, j]
        k = int(np.argmax(np.abs(col)))
        if col[k] < 0:
            Y[:, j] = -col
    return Y

def _axis_lock8(Y, prev_coords, nodes):
    if not prev_coords:
        return Y
    idx = [i for i, n in enumerate(nodes) if n in prev_coords]
    if len(idx) < 2:
        return Y
    prev = np.array([[prev_coords[nodes[i]][0], prev_coords[nodes[i]][1]] for i in idx], float)
    Ysub = Y[idx, :]
    best_err, best = float("inf"), Y
    for swap in (False, True):
        Z0 = (Ysub[:, [1,0]] if swap else Ysub)
        for sx in (1.0, -1.0):
            for sy in (1.0, -1.0):
                Z = Z0 * np.array([sx, sy])
                err = _err_scaled(Z, prev)
                if err < best_err:
                    best_err = err
                    best = (Y[:, [1,0]] if swap else Y) * np.array([sx, sy])
    return best

def deterministic_mds_2d(D, nodes, prev=None):
    import math
    nodes = list(nodes)
    n = len(nodes)
    M = np.array(D, dtype=float)
    if n == 0:
        return {}
    if n == 1:
        return {nodes[0]: [0.0, 0.0]}
    B = _double_center(M)
    w, V = np.linalg.eigh(B)
    idx = np.argsort(w)[::-1]
    w2 = np.clip(w[idx][:2], 0, None)
    V2 = V[:, idx][:, :2]
    L = np.diag(np.sqrt(w2))
    X = V2 @ L
    X = _sign_fix(X)
    if prev:
        X = _axis_lock8(X, prev, nodes)
    else:
        X = deterministic_rotate_first_snapshot(X, nodes)
    X[np.abs(X) < EPS] = 0.0
    out = {}
    for i, name in enumerate(nodes):
        out[name] = [float(f"{X[i, 0]:.4f}"), float(f"{X[i, 1]:.4f}")]
    return out
