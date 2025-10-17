# tools/make_snapshot.py
import csv, sys, argparse
from pathlib import Path

def load_square_matrix(path: str, expect_nodes: list[str] | None):
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Required CSV not found: {path}")

    with p.open(newline="", encoding="utf-8-sig") as f:
        rdr = csv.reader(f)
        rows = list(rdr)

    if not rows or len(rows) < 2:
        raise ValueError(f"{path} has no data")

    header = rows[0]

    # Case 1: Headered CSV: first cell is "node"
    if len(header) >= 2 and isinstance(header[0], str) and header[0].strip().lower() == "node":
        cols = header[1:]

        # If nodes were provided via CLI, enforce exact match & order
        if expect_nodes:
            if cols != expect_nodes:
                raise ValueError(
                    f"{path} header columns {cols} do not match --nodes {expect_nodes}"
                )
            nodes = expect_nodes
        else:
            nodes = cols

        # Build a mapping from node -> position in header
        col_index = {name: i for i, name in enumerate(cols)}
        n = len(nodes)

        # Build full n×n numeric matrix in node order
        D = [[0.0] * n for _ in range(n)]
        seen = set()

        for r in rows[1:]:
            if not r:
                continue
            row_node = r[0]
            if row_node not in nodes:
                # Unknown row label; skip it (or raise). We choose to skip.
                continue
            i = nodes.index(row_node)
            seen.add(row_node)

            # Convert row cells into a dict col_name->value
            vals = {}
            for j_name, raw in zip(cols, r[1:]):
                try:
                    vals[j_name] = float(raw)
                except Exception:
                    vals[j_name] = 0.0

            # Fill D[i][j] in nodes order; default 0 for missing
            for j, name in enumerate(nodes):
                if name == row_node:
                    D[i][j] = 0.0
                else:
                    D[i][j] = float(vals.get(name, 0.0))

            if len(D[i]) != n:
                raise AssertionError("internal rectangularization failed")

        if len(seen) != n:
            missing = [x for x in nodes if x not in seen]
            raise ValueError(f"{path}: missing rows for nodes: {missing}")

        return nodes, D

    # Case 2: Headerless numeric matrix (only allowed if expect_nodes provided)
    if not expect_nodes:
        raise ValueError(f"{path} header must be: node,<col1>,<col2>,...")

    nodes = expect_nodes
    n = len(nodes)

    # Parse all rows as numeric and require exactly n rows of length >= n
    body = rows
    if len(body) != n:
        raise ValueError(f"{path}: expected {n} rows, found {len(body)} (headerless mode)")

    D = []
    for r in body:
        # convert first n entries to float
        try:
            nums = [float(x) for x in r[:n]]
        except Exception:
            nums = []
            for x in r[:n]:
                try:
                    nums.append(float(x))
                except Exception:
                    nums.append(0.0)
        if len(nums) != n:
            raise ValueError(f"{path}: row has insufficient columns for n={n}")
        D.append(nums)

    return nodes, D

def mean_phi_per_node(nodes, D):
    n = len(nodes)
    # Validate rectangular shape once (defensive)
    for r in D:
        if len(r) != n:
            raise ValueError(f"matrix not rectangular: expected {n} columns, got {len(r)}")
    out = []
    for i in range(n):
        # sum off-diagonal safely
        s = 0.0
        for j in range(n):
            if j != i:
                s += D[i][j]
        out.append(s / (n - 1) if n > 1 else 0.0)
    return out

def validate_square(nodes, D):
    n = len(nodes)
    if len(D) != n or any(len(row) != n for row in D):
        sizes = [len(row) for row in D]
        raise SystemExit(
            f"node/matrix size mismatch: nodes={n}, "
            f"D has {len(D)} rows with row lengths={sizes}"
        )

def parse_nodes():
    """Parse optional --nodes argument and return a list of node names or None."""
    parser = argparse.ArgumentParser(description="Create snapshot from phi/kappa CSVs")
    parser.add_argument("--nodes", nargs="*", help="Explicit node order (e.g. A B C)")
    args = parser.parse_args()
    # Return None if not provided, otherwise a list (possibly empty)
    return args.nodes if args.nodes else None

def main():
    try:
        # parse args, e.g. --nodes A B C
        nodes_cli = parse_nodes()

        # Load phi/kappa; accept headered or headerless CSVs
        nodes, D = load_square_matrix("tools/out/phi_matrix.csv", nodes_cli)
        _, K = load_square_matrix("tools/out/kappa.csv", nodes_cli)

        # validate shapes before further processing
        validate_square(nodes, D)
        validate_square(nodes, K)

        # compute something simple so the script has a side-effect-free success path
        _ = mean_phi_per_node(nodes, D)

        # Exit success
        return 0
    except SystemExit:
        # Allow argparse or our own SystemExit to propagate naturally
        raise
    except Exception as e:
        # Print a helpful error for CI and exit with non-zero status
        print(str(e), file=sys.stderr)
        return 1
if __name__ == "__main__":
    sys.exit(main())

