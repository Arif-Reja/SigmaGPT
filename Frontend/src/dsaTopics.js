export const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const TOPICS = [
    {
        id: "sorting",
        title: "Sorting",
        category: "Algorithms",
        level: "Beginner",
        minutes: 30,
        icon: "fa-solid fa-arrow-down-1-9",
        viz: "array",
        vizStart: "bubble",
        summary:
            "Sorting puts values in order so they are easy to search, compare and combine. Most interview questions test whether you can pick the right algorithm and explain its cost.",
        ideas: [
            "Comparison sorts cannot beat O(n log n) in the worst case.",
            "A stable sort keeps equal values in their original order. This matters when you sort records by more than one field.",
            "Simple sorts (bubble, selection, insertion) are O(n²) but need no extra memory. Insertion sort is fast on nearly sorted data.",
            "Merge sort is always O(n log n) but needs O(n) extra space. Quick sort is usually fastest in practice but has an O(n²) worst case."
        ],
        tableTitle: "Algorithms",
        algorithms: [
            { name: "Bubble sort", time: "O(n²)", space: "O(1)", note: "Stable. O(n) on sorted input with an early exit." },
            { name: "Selection sort", time: "O(n²)", space: "O(1)", note: "Not stable. At most n - 1 swaps." },
            { name: "Insertion sort", time: "O(n²)", space: "O(1)", note: "Stable. O(n) on nearly sorted data." },
            { name: "Merge sort", time: "O(n log n)", space: "O(n)", note: "Stable. Divide and conquer." },
            { name: "Quick sort", time: "O(n log n) average, O(n²) worst", space: "O(log n)", note: "Not stable. The pivot choice matters." }
        ],
        whenToUse: [
            "Small or nearly sorted arrays: insertion sort.",
            "Guaranteed speed, or sorting linked lists: merge sort.",
            "General in-memory sorting: quick sort, or the library sort.",
            "In real code, use Arrays.sort() or Collections.sort(). They are tuned and well tested."
        ],
        tip: "Be ready to explain why quick sort can be O(n²): an always-bad pivot, such as the last element of an already sorted array. Random or median-of-three pivots avoid it. Also remember that Java sorts objects with TimSort, which is stable.",
        code: {
            title: "Bubble sort in Java",
            java: `import java.util.Arrays;

public class BubbleSortDemo {
    static void bubbleSort(int[] a) {
        for (int i = 0; i < a.length - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < a.length - 1 - i; j++) {
                if (a[j] > a[j + 1]) {
                    int temp = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }

    public static void main(String[] args) {
        int[] a = {5, 2, 9, 1, 7};
        bubbleSort(a);
        System.out.println(Arrays.toString(a));
    }
}`
        },
        problems: [
            { name: "Sort Colors", level: "Medium", idea: "Three pointers (the Dutch national flag) sort the 0s, 1s and 2s in one pass." },
            { name: "Merge Intervals", level: "Medium", idea: "Sort by start time, then merge neighbours that overlap." },
            { name: "Kth Largest Element in an Array", level: "Medium", idea: "A min-heap of size k, or quickselect." },
            { name: "Merge Sorted Array", level: "Easy", idea: "Fill the array from the back with three pointers." }
        ],
        quiz: [
            {
                q: "Which sorting algorithm is always O(n log n), even in the worst case?",
                options: ["Quick sort", "Merge sort", "Bubble sort", "Insertion sort"],
                answer: 1,
                why: "Merge sort always splits in halves and merges in linear time. Quick sort can degrade to O(n²)."
            },
            {
                q: "What does it mean for a sort to be stable?",
                options: ["It never crashes", "It uses no extra memory", "Equal values keep their original order", "It always runs in O(n)"],
                answer: 2,
                why: "A stable sort never swaps the relative order of equal values."
            },
            {
                q: "Which sort is the best choice for an array that is already almost sorted?",
                options: ["Selection sort", "Insertion sort", "Quick sort with the last element as pivot", "Bubble sort without an early exit"],
                answer: 1,
                why: "Insertion sort only moves the few out-of-place values, so it runs close to O(n)."
            }
        ]
    },
    {
        id: "searching",
        title: "Searching",
        category: "Algorithms",
        level: "Beginner",
        minutes: 20,
        icon: "fa-solid fa-magnifying-glass",
        viz: "array",
        vizStart: "binary",
        summary:
            "Searching finds a value in a collection. The more structure your data has, the faster you can search it.",
        ideas: [
            "Linear search works on any data but may check every element: O(n).",
            "Binary search needs sorted data and halves the search space at every step: O(log n).",
            "Binary search on a billion sorted values needs only about 30 steps.",
            "Hash tables find a value by its exact key in O(1) on average."
        ],
        tableTitle: "Algorithms",
        algorithms: [
            { name: "Linear search", time: "O(n)", space: "O(1)", note: "Works on unsorted data." },
            { name: "Binary search (loop)", time: "O(log n)", space: "O(1)", note: "Needs sorted data." },
            { name: "Binary search (recursive)", time: "O(log n)", space: "O(log n)", note: "Uses the call stack." },
            { name: "Hash lookup", time: "O(1) average", space: "O(n)", note: "Exact keys only." }
        ],
        whenToUse: [
            "Unsorted or tiny data: linear search.",
            "Sorted data that is searched many times: binary search.",
            "Exact-key lookups: HashMap.",
            "Binary search on the answer (the smallest value that works) when a yes/no check is monotonic."
        ],
        tip: "Write mid = low + (high - low) / 2 to avoid integer overflow, and decide clearly whether the loop is low <= high or low < high before you code.",
        code: {
            title: "Binary search in Java",
            java: `public class BinarySearchDemo {
    static int binarySearch(int[] a, int target) {
        int low = 0;
        int high = a.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (a[mid] == target) return mid;
            if (a[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] a = {2, 5, 8, 12, 16, 23, 38, 56};
        System.out.println(binarySearch(a, 23));
        System.out.println(binarySearch(a, 7));
    }
}`
        },
        problems: [
            { name: "Binary Search", level: "Easy", idea: "Shrink low and high around the middle until they cross." },
            { name: "Search in Rotated Sorted Array", level: "Medium", idea: "One half is always sorted. Decide which half can hold the target." },
            { name: "Find First and Last Position of Element in Sorted Array", level: "Medium", idea: "Two binary searches: one for the left edge, one for the right edge." },
            { name: "Sqrt(x)", level: "Easy", idea: "Binary search the answer between 0 and x." }
        ],
        quiz: [
            {
                q: "What must be true before you can use binary search on an array?",
                options: ["It has no duplicates", "It is sorted", "It has an even length", "It holds only integers"],
                answer: 1,
                why: "Binary search discards half the array by comparing with the middle, which only works if the data is in order."
            },
            {
                q: "At most how many comparisons does binary search need for 1,000 sorted values?",
                options: ["About 10", "About 100", "About 500", "1,000"],
                answer: 0,
                why: "The range halves each time, and log2(1000) is just under 10."
            },
            {
                q: "Why write mid = low + (high - low) / 2 instead of (low + high) / 2?",
                options: ["It is faster", "It avoids integer overflow for very large indexes", "It rounds up", "It works on unsorted arrays"],
                answer: 1,
                why: "low + high can exceed the largest int. low + (high - low) / 2 never does."
            }
        ]
    },
    {
        id: "stacks-queues",
        title: "Stacks & Queues",
        category: "Data structures",
        level: "Beginner",
        minutes: 25,
        icon: "fa-solid fa-layer-group",
        viz: "stackqueue",
        summary:
            "A stack is last-in, first-out (LIFO). A queue is first-in, first-out (FIFO). Both add and remove at their ends in O(1).",
        ideas: [
            "Stack: push and pop at the top, like a pile of plates.",
            "Queue: enqueue at the rear and dequeue from the front, like a line at a ticket counter.",
            "Your program's call stack is a real stack. That is why very deep recursion causes a StackOverflowError.",
            "In Java, use ArrayDeque for both. The old Stack class is synchronized and slower."
        ],
        tableTitle: "Operations",
        algorithms: [
            { name: "Push / Enqueue", time: "O(1)", note: "Add at the top or rear." },
            { name: "Pop / Dequeue", time: "O(1)", note: "Remove from the top or front." },
            { name: "Peek", time: "O(1)", note: "Look without removing." },
            { name: "Search for a value", time: "O(n)", note: "Neither structure is built for searching." }
        ],
        whenToUse: [
            "Stack: undo history, matching brackets, expression evaluation, depth-first search.",
            "Queue: task scheduling, buffering, breadth-first search.",
            "Monotonic stack: next greater element problems.",
            "Deque: sliding window maximum."
        ],
        tip: "Many problems come down to 'what must I remember, and in which order?'. If the most recent item matters, think stack. If the oldest item matters, think queue.",
        code: {
            title: "Balanced brackets with a stack",
            java: `import java.util.ArrayDeque;
import java.util.Deque;

public class BalancedBrackets {
    static boolean isBalanced(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') {
                stack.push(c);
            } else if (c == ')' || c == ']' || c == '}') {
                if (stack.isEmpty()) return false;
                char open = stack.pop();
                if ((c == ')' && open != '(')
                        || (c == ']' && open != '[')
                        || (c == '}' && open != '{')) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println(isBalanced("{[()]}"));
        System.out.println(isBalanced("([)]"));
    }
}`
        },
        problems: [
            { name: "Valid Parentheses", level: "Easy", idea: "Push openers. On every closer, pop and check that it matches." },
            { name: "Min Stack", level: "Medium", idea: "Keep a second stack that holds the minimum so far." },
            { name: "Implement Queue using Stacks", level: "Easy", idea: "One stack for input and one for output. Move items only when the output stack is empty." },
            { name: "Daily Temperatures", level: "Medium", idea: "A monotonic stack of indexes that are waiting for a warmer day." }
        ],
        quiz: [
            {
                q: "Which data structure is used to check that brackets in an expression are balanced?",
                options: ["Queue", "Stack", "Hash table", "Binary tree"],
                answer: 1,
                why: "The most recent opening bracket must be closed first, which is last-in, first-out."
            },
            {
                q: "In what order does a queue remove its elements?",
                options: ["Last in, first out", "First in, first out", "Smallest first", "Random order"],
                answer: 1,
                why: "A queue serves the element that has waited longest."
            },
            {
                q: "Which Java class does the documentation recommend instead of the old Stack class?",
                options: ["Vector", "ArrayDeque", "LinkedHashMap", "TreeSet"],
                answer: 1,
                why: "The Deque interface and its implementations, such as ArrayDeque, are the recommended replacement."
            }
        ]
    },
    {
        id: "linked-lists",
        title: "Linked Lists",
        category: "Data structures",
        level: "Beginner",
        minutes: 30,
        icon: "fa-solid fa-link",
        viz: "linkedlist",
        summary:
            "A linked list stores values in nodes, and each node points to the next one. Insertions and deletions are cheap, but you give up fast access by position.",
        ideas: [
            "Each node holds a value and a reference to the next node (and to the previous one in a doubly linked list).",
            "Inserting or deleting next to a node you already have is O(1). Finding a node by position is O(n).",
            "Pointer problems are about order: save next, then re-link.",
            "Fast and slow pointers solve many problems: finding the middle and detecting a cycle."
        ],
        tableTitle: "Operations",
        algorithms: [
            { name: "Insert at head", time: "O(1)", note: "The new node points to the old head." },
            { name: "Insert at tail", time: "O(n)", note: "O(1) if you keep a tail pointer." },
            { name: "Delete a given value", time: "O(n)", note: "Finding it costs O(n). The re-link itself is O(1)." },
            { name: "Search", time: "O(n)", note: "You must follow the links." },
            { name: "Reverse", time: "O(n)", space: "O(1)", note: "Three pointers: prev, curr, next." },
            { name: "Cycle detection (Floyd)", time: "O(n)", space: "O(1)", note: "A fast and a slow pointer meet if there is a cycle." }
        ],
        whenToUse: [
            "Frequent inserts and removals at the ends or next to known nodes.",
            "When you do not know the size in advance.",
            "Building blocks for queues, stacks and LRU caches (together with a hash map).",
            "Avoid when you need fast access by index. In practice an ArrayList is often faster, because arrays use the CPU cache well."
        ],
        tip: "Draw the nodes and arrows on paper. A dummy head node removes the special case where the head changes.",
        code: {
            title: "Reverse a linked list",
            java: `public class ReverseList {
    static class Node {
        int val;
        Node next;

        Node(int val) {
            this.val = val;
        }
    }

    static Node reverse(Node head) {
        Node prev = null;
        Node curr = head;
        while (curr != null) {
            Node next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }

    public static void main(String[] args) {
        Node head = new Node(1);
        head.next = new Node(2);
        head.next.next = new Node(3);
        for (Node n = reverse(head); n != null; n = n.next) {
            System.out.print(n.val + " ");
        }
    }
}`
        },
        problems: [
            { name: "Reverse Linked List", level: "Easy", idea: "Three pointers: prev, curr and next." },
            { name: "Linked List Cycle", level: "Easy", idea: "A fast and a slow pointer meet if there is a cycle." },
            { name: "Merge Two Sorted Lists", level: "Easy", idea: "A dummy head and a tail pointer." },
            { name: "Remove Nth Node From End of List", level: "Medium", idea: "Two pointers that start n steps apart." }
        ],
        quiz: [
            {
                q: "How long does it take to insert a new node at the head of a singly linked list?",
                options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
                answer: 0,
                why: "Only the new node and the head reference change, whatever the length."
            },
            {
                q: "Which technique detects a cycle in a linked list using O(1) extra space?",
                options: ["Sorting the nodes", "Fast and slow pointers", "A hash set of visited nodes", "Recursion"],
                answer: 1,
                why: "Floyd's method uses two pointers. A hash set would need O(n) extra space."
            },
            {
                q: "Why is reading the 500th element of a linked list slow?",
                options: ["Nodes are stored in sorted order", "You must follow 499 links from the head", "Linked lists live on disk", "Each node must be copied first"],
                answer: 1,
                why: "There is no index to jump to, so you walk the list from the start."
            }
        ]
    },
    {
        id: "hash-tables",
        title: "Hash Tables",
        category: "Data structures",
        level: "Intermediate",
        minutes: 30,
        icon: "fa-solid fa-hashtag",
        viz: "hash",
        summary:
            "A hash table maps keys to values. A hash function turns each key into an array index, so lookups, inserts and deletes take O(1) on average.",
        ideas: [
            "A hash function spreads keys across buckets. Two keys that land in the same bucket are a collision.",
            "Chaining keeps colliding keys in a list inside the bucket. Open addressing probes for another free slot instead.",
            "The load factor (items divided by buckets) controls speed. Java's HashMap grows the table when it passes 0.75.",
            "Keys used in a HashMap need a consistent equals() and hashCode()."
        ],
        tableTitle: "Operations",
        algorithms: [
            { name: "Insert", time: "O(1) average, O(n) worst", note: "Since Java 8, long chains turn into balanced trees." },
            { name: "Lookup", time: "O(1) average, O(n) worst", note: "Compare keys inside one bucket only." },
            { name: "Delete", time: "O(1) average, O(n) worst", note: "Remove from the chain." },
            { name: "Resize (rehash)", time: "O(n)", note: "Rare, so inserts stay O(1) amortized." }
        ],
        whenToUse: [
            "Counting and frequency problems.",
            "Checking whether you have seen a value before (duplicates, two sum).",
            "Caching and memoization.",
            "Grouping items by a key, such as anagrams. Use TreeMap if you need the keys in sorted order."
        ],
        tip: "Many array problems drop from O(n²) to O(n) when you store what you have already seen in a HashMap or HashSet.",
        code: {
            title: "Two Sum with a HashMap",
            java: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class TwoSum {
    static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[] {j, i};
            seen.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        int[] result = twoSum(new int[] {2, 7, 11, 15}, 9);
        System.out.println(Arrays.toString(result));
    }
}`
        },
        problems: [
            { name: "Two Sum", level: "Easy", idea: "Store each value's index and look for target minus the current value." },
            { name: "Group Anagrams", level: "Medium", idea: "Use the sorted letters (or the letter counts) as the key." },
            { name: "Longest Substring Without Repeating Characters", level: "Medium", idea: "A sliding window with a set or a last-seen map." },
            { name: "Subarray Sum Equals K", level: "Medium", idea: "Prefix sums with a map of how often each sum has appeared." }
        ],
        quiz: [
            {
                q: "What is a collision in a hash table?",
                options: ["Two keys map to the same bucket", "A key is not found", "The table is full", "A key is deleted twice"],
                answer: 0,
                why: "Different keys can produce the same bucket index, so the table needs a way to store both."
            },
            {
                q: "What is the average time to look up a key in a well-designed hash table?",
                options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                answer: 0,
                why: "The hash jumps straight to a bucket, and each bucket holds only a few keys."
            },
            {
                q: "If you use your own class as a HashMap key, which two methods must be consistent?",
                options: ["toString and clone", "equals and hashCode", "compareTo and finalize", "get and put"],
                answer: 1,
                why: "Equal objects must return the same hashCode, or the map will look in the wrong bucket."
            }
        ]
    },
    {
        id: "trees",
        title: "Trees & BST",
        category: "Trees & graphs",
        level: "Intermediate",
        minutes: 40,
        icon: "fa-solid fa-sitemap",
        viz: "tree",
        summary:
            "A tree is a hierarchy of nodes. A binary search tree (BST) keeps smaller values on the left and bigger values on the right, so searching is fast when the tree is balanced.",
        ideas: [
            "In a BST, everything in the left subtree is smaller and everything in the right subtree is bigger.",
            "An inorder traversal of a BST visits the values in sorted order.",
            "Height decides speed. A balanced tree gives O(log n), but sorted input turns a plain BST into an O(n) chain.",
            "Balanced trees (AVL, red-black) keep the height small automatically. Java's TreeMap is a red-black tree."
        ],
        tableTitle: "Algorithms",
        algorithms: [
            { name: "Inorder (left, node, right)", time: "O(n)", space: "O(h)", note: "Sorted order for a BST." },
            { name: "Preorder (node, left, right)", time: "O(n)", space: "O(h)", note: "Copying a tree." },
            { name: "Postorder (left, right, node)", time: "O(n)", space: "O(h)", note: "Deleting a tree, computing heights." },
            { name: "Level order (BFS)", time: "O(n)", space: "O(w)", note: "Uses a queue. w is the widest level." },
            { name: "BST search / insert", time: "O(h)", note: "O(log n) if balanced, O(n) for a chain." }
        ],
        whenToUse: [
            "Sorted data with frequent inserts and deletes: TreeMap or TreeSet.",
            "Hierarchies: file systems, org charts, the DOM.",
            "Range queries and 'next larger value' questions.",
            "Heaps (priority queues) are special trees stored in arrays."
        ],
        tip: "Most tree problems are recursion: solve the left and right subtrees, then combine. Say clearly what your function returns for a null node.",
        code: {
            title: "Build a BST and print it in order",
            java: `public class BstDemo {
    static class Node {
        int val;
        Node left;
        Node right;

        Node(int val) {
            this.val = val;
        }
    }

    static Node insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.val) root.left = insert(root.left, val);
        else if (val > root.val) root.right = insert(root.right, val);
        return root;
    }

    static void inorder(Node node) {
        if (node == null) return;
        inorder(node.left);
        System.out.print(node.val + " ");
        inorder(node.right);
    }

    public static void main(String[] args) {
        Node root = null;
        for (int v : new int[] {50, 30, 70, 20, 40, 60, 80}) {
            root = insert(root, v);
        }
        inorder(root);
    }
}`
        },
        problems: [
            { name: "Maximum Depth of Binary Tree", level: "Easy", idea: "1 + the larger of the left depth and the right depth." },
            { name: "Validate Binary Search Tree", level: "Medium", idea: "Pass down the allowed minimum and maximum for every node." },
            { name: "Binary Tree Level Order Traversal", level: "Medium", idea: "BFS with a queue, one level at a time." },
            { name: "Lowest Common Ancestor of a Binary Search Tree", level: "Medium", idea: "Walk down. The first node that separates the two values is the answer." }
        ],
        quiz: [
            {
                q: "Which traversal of a binary search tree visits the values in sorted order?",
                options: ["Preorder", "Inorder", "Postorder", "Level order"],
                answer: 1,
                why: "Inorder visits the left subtree (smaller), then the node, then the right subtree (bigger)."
            },
            {
                q: "What is the worst-case time to search a BST with n nodes?",
                options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                answer: 2,
                why: "If values were inserted in sorted order, the tree is a chain and the search visits every node."
            },
            {
                q: "Which data structure does a level-order traversal use?",
                options: ["Stack", "Queue", "Hash set", "Priority queue"],
                answer: 1,
                why: "A queue serves nodes in the order they were found, which gives level by level."
            }
        ]
    },
    {
        id: "graphs",
        title: "Graphs",
        category: "Trees & graphs",
        level: "Intermediate",
        minutes: 45,
        icon: "fa-solid fa-share-nodes",
        viz: "graph",
        summary:
            "A graph is a set of nodes (vertices) joined by edges. Graphs model networks: maps, friendships, web links and task dependencies.",
        ideas: [
            "Edges can be directed (one way) or undirected, and they can carry weights.",
            "Most problems use an adjacency list: each node stores its neighbours. It takes O(V + E) space.",
            "BFS explores level by level with a queue. It finds the shortest path in an unweighted graph.",
            "DFS goes as deep as it can, then backtracks, using recursion or a stack. Always keep a visited set so cycles do not loop forever."
        ],
        tableTitle: "Algorithms",
        algorithms: [
            { name: "Breadth-first search (BFS)", time: "O(V + E)", space: "O(V)", note: "Shortest path when all edges cost the same." },
            { name: "Depth-first search (DFS)", time: "O(V + E)", space: "O(V)", note: "Cycles, components, exploring everything." },
            { name: "Dijkstra", time: "O((V + E) log V)", space: "O(V)", note: "Shortest path with non-negative weights." },
            { name: "Topological sort", time: "O(V + E)", space: "O(V)", note: "Order tasks that have dependencies (a DAG)." },
            { name: "Union-Find", time: "nearly O(1) per operation", space: "O(V)", note: "Connected components." }
        ],
        whenToUse: [
            "Shortest path when every step costs the same: BFS.",
            "Exploring all possibilities, finding cycles or connected components: DFS.",
            "Ordering tasks with dependencies: topological sort.",
            "Shortest path with different costs: Dijkstra."
        ],
        tip: "Say what the nodes and edges are before you code. Grids are graphs too: every cell is a node connected to its 4 neighbours.",
        code: {
            title: "Breadth-first search",
            java: `import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;

public class BfsDemo {
    public static void main(String[] args) {
        Map<Integer, List<Integer>> graph = new HashMap<>();
        graph.put(0, Arrays.asList(1, 2));
        graph.put(1, Arrays.asList(3));
        graph.put(2, Arrays.asList(3));
        graph.put(3, Collections.<Integer>emptyList());

        Queue<Integer> queue = new ArrayDeque<>();
        Set<Integer> visited = new HashSet<>();
        queue.add(0);
        visited.add(0);

        while (!queue.isEmpty()) {
            int node = queue.poll();
            System.out.print(node + " ");
            for (int next : graph.get(node)) {
                if (visited.add(next)) {
                    queue.add(next);
                }
            }
        }
    }
}`
        },
        problems: [
            { name: "Number of Islands", level: "Medium", idea: "Start a DFS or BFS from every unvisited land cell." },
            { name: "Clone Graph", level: "Medium", idea: "DFS or BFS with a map from old nodes to their copies." },
            { name: "Course Schedule", level: "Medium", idea: "Detect a cycle, or run a topological sort." },
            { name: "Rotting Oranges", level: "Medium", idea: "Multi-source BFS. Count minutes by level." }
        ],
        quiz: [
            {
                q: "Which algorithm finds the shortest path in an unweighted graph?",
                options: ["DFS", "BFS", "Binary search", "Merge sort"],
                answer: 1,
                why: "BFS visits nodes in order of distance from the start, so the first time it reaches a node is the shortest way."
            },
            {
                q: "What is the time complexity of BFS on a graph stored as an adjacency list?",
                options: ["O(V)", "O(E)", "O(V + E)", "O(V × E)"],
                answer: 2,
                why: "Every vertex is visited once and every edge is looked at a constant number of times."
            },
            {
                q: "Why do graph traversals need a visited set?",
                options: ["To sort the nodes", "To avoid revisiting nodes and looping forever on cycles", "To store edge weights", "To make the graph directed"],
                answer: 1,
                why: "Without it, a cycle would send the search around forever."
            }
        ]
    },
    {
        id: "dp",
        title: "Dynamic Programming",
        category: "Techniques",
        level: "Advanced",
        minutes: 50,
        icon: "fa-solid fa-table-cells",
        viz: "dp",
        summary:
            "Dynamic programming solves a problem by breaking it into overlapping smaller problems and remembering each answer, so nothing is computed twice.",
        ideas: [
            "It applies when a problem has overlapping subproblems and an optimal substructure.",
            "Top-down (memoization) adds a cache to recursion. Bottom-up (tabulation) fills a table in order.",
            "Define the state first: what does dp[i] or dp[i][j] mean? Then write the transition.",
            "Naive recursive Fibonacci takes exponential time. With memoization it is O(n)."
        ],
        tableTitle: "Classic problems",
        algorithms: [
            { name: "Fibonacci (memoized)", time: "O(n)", space: "O(n)", note: "Each value is computed once." },
            { name: "Climbing stairs / House robber", time: "O(n)", space: "O(1)", note: "Only the last two values are needed." },
            { name: "0/1 Knapsack", time: "O(n × W)", space: "O(n × W)", note: "W is the capacity." },
            { name: "Longest Common Subsequence", time: "O(m × n)", space: "O(m × n)", note: "The table in the visualizer." },
            { name: "Coin change", time: "O(amount × coins)", space: "O(amount)", note: "Fewest coins for an amount." }
        ],
        whenToUse: [
            "Counting ways, or finding a minimum or maximum, with choices at every step.",
            "A brute-force recursion keeps solving the same inputs.",
            "Strings and sequences: LCS, edit distance, longest increasing subsequence.",
            "'Take it or skip it' problems, such as knapsack."
        ],
        tip: "Start with brute-force recursion, spot the repeated calls, add memoization, and turn it into a table if asked. Interviewers want to see that path.",
        code: {
            title: "Longest common subsequence",
            java: `public class LcsDemo {
    static int lcs(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        return dp[a.length()][b.length()];
    }

    public static void main(String[] args) {
        System.out.println(lcs("ABCBDAB", "BDCABA"));
    }
}`
        },
        problems: [
            { name: "Climbing Stairs", level: "Easy", idea: "ways(n) = ways(n - 1) + ways(n - 2)." },
            { name: "House Robber", level: "Medium", idea: "best(i) = max(best(i - 1), best(i - 2) + value(i))." },
            { name: "Coin Change", level: "Medium", idea: "dp[a] = 1 + the minimum of dp[a - coin] over all coins." },
            { name: "Longest Common Subsequence", level: "Medium", idea: "The table you just watched in the visualizer." }
        ],
        quiz: [
            {
                q: "Which two properties suggest that dynamic programming can be used?",
                options: ["Sorted input and unique values", "Overlapping subproblems and optimal substructure", "Recursion and loops", "Trees and graphs"],
                answer: 1,
                why: "Overlapping subproblems make caching worthwhile, and optimal substructure lets you build the answer from smaller answers."
            },
            {
                q: "What does memoization do?",
                options: ["Sorts the input", "Stores the results of calls so they are not computed again", "Removes recursion completely", "Compresses the input"],
                answer: 1,
                why: "The first time an input is solved, the answer is saved and reused."
            },
            {
                q: "What is the time complexity of the standard LCS table for strings of length m and n?",
                options: ["O(m + n)", "O(m × n)", "O(2^(m + n))", "O(log(m × n))"],
                answer: 1,
                why: "The table has (m + 1) × (n + 1) cells and each one takes constant time."
            }
        ]
    }
];