"""Compare level-order binary tree searches with BST searches.

Run: python3 output/plain_binary_tree_experiment.py
The random seed and search queries are fixed, so results are reproducible.
"""

import random
from collections import deque


class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None


class BinaryTree:
    def __init__(self):
        self.root = None
        # These nodes still have a free child position, in level order.
        self.open_nodes = deque()

    def insert(self, key):
        new_node = Node(key)
        if self.root is None:
            self.root = new_node
            self.open_nodes.append(new_node)
            return

        parent = self.open_nodes[0]
        if parent.left is None:
            parent.left = new_node
        else:
            parent.right = new_node
            self.open_nodes.popleft()  # Both positions are now filled.
        self.open_nodes.append(new_node)

    def search(self, key):
        """Return (found, number of nodes visited) using level-order search."""
        if self.root is None:
            return False, 0

        queue = deque([self.root])
        visited = 0
        while queue:
            node = queue.popleft()
            visited += 1
            if node.key == key:
                return True, visited
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        return False, visited


class BST:
    def __init__(self):
        self.root = None

    def insert(self, key):
        new_node = Node(key)
        if self.root is None:
            self.root = new_node
            return

        current = self.root
        while True:
            if key < current.key:
                if current.left is None:
                    current.left = new_node
                    return
                current = current.left
            elif key > current.key:
                if current.right is None:
                    current.right = new_node
                    return
                current = current.right
            else:
                return  # This experiment uses unique keys.

    def search(self, key):
        """Return (found, number of nodes visited) using the BST property."""
        current = self.root
        visited = 0
        while current is not None:
            visited += 1
            if key == current.key:
                return True, visited
            if key < current.key:
                current = current.left
            else:
                current = current.right
        return False, visited


def average_visits(tree, queries, expected_found):
    total = 0
    for key in queries:
        found, visited = tree.search(key)
        assert found == expected_found
        total += visited
    return total / len(queries)


def run_experiment():
    rng = random.Random(42)
    results = []
    for n in (100, 1_000, 10_000):
        # Even keys exist; odd keys are guaranteed to be absent.
        keys = rng.sample(range(0, 1_000_000, 2), n)
        existing = rng.sample(keys, 100)
        missing = rng.sample(range(1, 1_000_000, 2), 100)

        plain = BinaryTree()
        random_bst = BST()
        sorted_bst = BST()
        for key in keys:
            plain.insert(key)
            random_bst.insert(key)
        for key in sorted(keys):
            sorted_bst.insert(key)

        for name, tree in (("Plain binary tree", plain),
                           ("BST, random insertion", random_bst),
                           ("BST, sorted insertion", sorted_bst)):
            results.append((n, name,
                            average_visits(tree, existing, True),
                            average_visits(tree, missing, False)))
    return results


if __name__ == "__main__":
    print("n,tree,existing_avg,missing_avg")
    for n, name, existing, missing in run_experiment():
        print(f"{n},{name},{existing:.2f},{missing:.2f}")
