// ===== Limits =====

export const MIN_SIZE = 5;
export const MAX_SORT_SIZE = 30;
export const MAX_SEARCH_SIZE = 16;
export const MIN_VALUE = 1;
export const MAX_VALUE = 99;

export const SPEEDS = [0.5, 1, 2, 4, 8, 16];
export const DEFAULT_SPEED_INDEX = 2;
export const BASE_DELAY_MS = 600; // time per step at 1x

export const maxSizeFor = (algorithm) =>
    algorithm.type === "search" ? MAX_SEARCH_SIZE : MAX_SORT_SIZE;


// ===== Random data =====

const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = (list) => {
    const copy = [...list];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = randomInt(0, i);

        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
};

// Different values from 5 to 99, so every bar is easy to see
const uniqueValues = (size) =>
    shuffle(
        Array.from({ length: MAX_VALUE - 4 }, (_, index) => index + 5)
    ).slice(0, size);

export const ARRAY_KINDS = [
    { key: "random", label: "Random" },
    { key: "nearly", label: "Nearly sorted" },
    { key: "reversed", label: "Reversed" },
    { key: "few", label: "Few unique" }
];

export const makeArray = (kind, size) => {
    const count = Math.min(Math.max(size, 2), MAX_SORT_SIZE);
    const values = uniqueValues(count);

    if (kind === "nearly") {
        const sorted = values.sort((a, b) => a - b);
        const swaps = Math.max(1, Math.round(count / 8));

        for (let s = 0; s < swaps; s++) {
            const i = randomInt(0, count - 2);

            [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
        }

        return sorted;
    }

    if (kind === "reversed") {
        return values.sort((a, b) => b - a);
    }

    if (kind === "few") {
        const pool = uniqueValues(Math.min(4, count));

        return Array.from(
            { length: count },
            () => pool[randomInt(0, pool.length - 1)]
        );
    }

    return values;
};

// A value that is in the array
export const pickTarget = (array) => array[randomInt(0, array.length - 1)];

// A value that is not in the array
export const missingTarget = (array) => {
    const present = new Set(array);
    const candidates = [];

    for (let value = MIN_VALUE; value <= MAX_VALUE; value++) {
        if (!present.has(value)) candidates.push(value);
    }

    return candidates.length
        ? candidates[randomInt(0, candidates.length - 1)]
        : MAX_VALUE;
};

// Returns a number from 1 to 99, or null when the text is not valid
export const parseTarget = (text) => {
    const trimmed = String(text).trim();

    if (!/^\d{1,2}$/.test(trimmed)) return null;

    const value = Number(trimmed);

    return value >= MIN_VALUE && value <= MAX_VALUE ? value : null;
};

// Turns "5, 3, 9" into [5, 3, 9], or returns an error message
export const parseNumberList = (text, maxSize) => {
    const parts = String(text).split(/[\s,;]+/).filter(Boolean);

    if (parts.length < 2) {
        return { error: "Enter at least 2 numbers, separated by commas." };
    }

    if (parts.length > maxSize) {
        return {
            error: `Enter at most ${maxSize} numbers for this algorithm.`
        };
    }

    const values = parts.map((part) =>
        /^\d{1,2}$/.test(part) ? Number(part) : NaN
    );

    if (
        values.some(
            (value) =>
                !Number.isInteger(value) ||
                value < MIN_VALUE ||
                value > MAX_VALUE
        )
    ) {
        return {
            error: `Use whole numbers from ${MIN_VALUE} to ${MAX_VALUE}.`
        };
    }

    return { values };
};


// ===== Recording the steps =====
// Every step is a snapshot: the array, which line of code runs, what to
// highlight, and a short explanation. The screen simply shows one snapshot.

class Recorder {
    constructor(initial, startMessage = "Start: this is the input array.") {
        this.array = [...initial];
        this.steps = [];
        this.comparisons = 0;
        this.moves = 0;
        this.sorted = new Set();

        this.push(-1, startMessage);
    }

    push(line, message, marks = {}) {
        this.steps.push({
            array: [...this.array],
            line,
            message,
            comparisons: this.comparisons,
            moves: this.moves,
            sorted: [...this.sorted],
            compare: [],
            swap: [],
            pivot: null,
            range: null,
            found: null,
            pointers: [],
            ...marks
        });
    }

    // Marks every value as sorted and adds the last step
    finish(message, line = -1) {
        for (let i = 0; i < this.array.length; i++) {
            this.sorted.add(i);
        }

        this.push(line, message);

        return this.steps;
    }
}


// ===== Sorting =====

const bubbleSort = (input) => {
    const r = new Recorder(input);
    const a = r.array;
    const n = a.length;

    for (let i = 0; i < n - 1; i++) {
        let swapped = false;
        const end = n - 1 - i;

        for (let j = 0; j < end; j++) {
            r.comparisons++;

            const needsSwap = a[j] > a[j + 1];

            r.push(
                3,
                needsSwap
                    ? `Compare ${a[j]} and ${a[j + 1]}: the left one is bigger, so they swap.`
                    : `Compare ${a[j]} and ${a[j + 1]}: already in order.`,
                { compare: [j, j + 1], range: [0, end] }
            );

            if (needsSwap) {
                [a[j], a[j + 1]] = [a[j + 1], a[j]];
                r.moves++;
                swapped = true;

                r.push(4, `Swapped: ${a[j + 1]} moves one step to the right.`, {
                    swap: [j, j + 1],
                    range: [0, end]
                });
            }
        }

        r.sorted.add(end);

        r.push(7, `Pass ${i + 1} done: ${a[end]} is now in its final place.`, {
            range: [0, Math.max(end - 1, 0)]
        });

        if (!swapped) {
            return r.finish(
                "A full pass without any swap means the array is sorted, so we can stop early.",
                8
            );
        }
    }

    return r.finish("Done: the array is sorted.");
};

const selectionSort = (input) => {
    const r = new Recorder(input);
    const a = r.array;
    const n = a.length;

    for (let i = 0; i < n - 1; i++) {
        let min = i;

        r.push(
            1,
            `Pass ${i + 1}: assume ${a[i]} (position ${i}) is the smallest so far.`,
            { pivot: min, range: [i, n - 1] }
        );

        for (let j = i + 1; j < n; j++) {
            r.comparisons++;

            const smaller = a[j] < a[min];

            r.push(
                3,
                `Compare ${a[j]} with the smallest so far, ${a[min]}: ${smaller ? "a new smallest value." : "not smaller."}`,
                { compare: [j], pivot: min, range: [i, n - 1] }
            );

            if (smaller) {
                min = j;

                r.push(4, `New smallest value: ${a[min]} at position ${min}.`, {
                    pivot: min,
                    range: [i, n - 1]
                });
            }
        }

        if (min !== i) {
            [a[i], a[min]] = [a[min], a[i]];
            r.moves++;
            r.sorted.add(i);

            r.push(7, `Swap the smallest value, ${a[i]}, into position ${i}.`, {
                swap: [i, min],
                range: [i, n - 1]
            });
        } else {
            r.sorted.add(i);

            r.push(7, `${a[i]} is already in the right place.`, {
                range: [i, n - 1]
            });
        }
    }

    return r.finish("Done: the array is sorted.");
};

const insertionSort = (input) => {
    const r = new Recorder(input);
    const a = r.array;
    const n = a.length;

    r.sorted.add(0);

    for (let i = 1; i < n; i++) {
        let j = i;

        r.push(
            1,
            `Take ${a[i]} (position ${i}) and slide it left into the sorted part.`,
            { pivot: i, range: [0, i] }
        );

        while (j > 0) {
            r.comparisons++;

            const needsSwap = a[j - 1] > a[j];

            r.push(
                2,
                needsSwap
                    ? `Compare ${a[j - 1]} and ${a[j]}: the left one is bigger, so they swap.`
                    : `Compare ${a[j - 1]} and ${a[j]}: in order, so ${a[j]} stops here.`,
                { compare: [j - 1, j], range: [0, i] }
            );

            if (!needsSwap) break;

            [a[j - 1], a[j]] = [a[j], a[j - 1]];
            r.moves++;

            r.push(3, `Swapped: ${a[j - 1]} moves one step to the left.`, {
                swap: [j - 1, j],
                range: [0, i]
            });

            j--;
        }

        for (let k = 0; k <= i; k++) {
            r.sorted.add(k);
        }

        r.push(5, `The first ${i + 1} values are now in sorted order.`, {
            range: [0, i]
        });
    }

    return r.finish("Done: the array is sorted.");
};

const mergeSort = (input) => {
    const r = new Recorder(input);
    const a = r.array;
    const n = a.length;

    const merge = (lo, mid, hi) => {
        const left = a.slice(lo, mid + 1);
        const right = a.slice(mid + 1, hi + 1);

        let l = 0;
        let rr = 0;
        let k = lo;

        while (l < left.length && rr < right.length) {
            r.comparisons++;

            const takeLeft = left[l] <= right[rr];

            r.push(
                8,
                `Compare ${left[l]} (left half) and ${right[rr]} (right half): take ${takeLeft ? left[l] : right[rr]}.`,
                { range: [lo, hi] }
            );

            const value = takeLeft ? left[l++] : right[rr++];

            a[k] = value;
            r.moves++;

            r.push(9, `Write ${value} into position ${k}.`, {
                swap: [k],
                range: [lo, hi]
            });

            k++;
        }

        while (l < left.length) {
            const value = left[l++];

            a[k] = value;
            r.moves++;

            r.push(
                9,
                `The right half is used up: copy ${value} from the left half into position ${k}.`,
                { swap: [k], range: [lo, hi] }
            );

            k++;
        }

        while (rr < right.length) {
            const value = right[rr++];

            a[k] = value;
            r.moves++;

            r.push(
                9,
                `The left half is used up: copy ${value} from the right half into position ${k}.`,
                { swap: [k], range: [lo, hi] }
            );

            k++;
        }
    };

    const sort = (lo, hi) => {
        if (lo >= hi) return;

        const mid = Math.floor((lo + hi) / 2);

        r.push(2, `Split positions ${lo} to ${hi} at the middle, position ${mid}.`, {
            range: [lo, hi]
        });

        sort(lo, mid);
        sort(mid + 1, hi);

        r.push(
            5,
            `Merge the two sorted halves, ${lo} to ${mid} and ${mid + 1} to ${hi}.`,
            { range: [lo, hi] }
        );

        merge(lo, mid, hi);
    };

    sort(0, n - 1);

    return r.finish("Done: the array is sorted.");
};

const quickSort = (input) => {
    const r = new Recorder(input);
    const a = r.array;

    const sort = (lo, hi) => {
        if (lo > hi) return;

        if (lo === hi) {
            r.sorted.add(lo);

            r.push(1, `Only ${a[lo]} is left in this part, so it is already in place.`, {
                range: [lo, hi]
            });

            return;
        }

        const pivot = a[hi];

        r.push(2, `Choose the last value, ${pivot}, as the pivot.`, {
            pivot: hi,
            range: [lo, hi]
        });

        let i = lo - 1;

        for (let j = lo; j < hi; j++) {
            r.comparisons++;

            const smaller = a[j] < pivot;

            r.push(
                5,
                `Compare ${a[j]} with the pivot ${pivot}: ${smaller ? "smaller, so it belongs on the left side." : "not smaller, so it stays on the right side."}`,
                { compare: [j], pivot: hi, range: [lo, hi] }
            );

            if (smaller) {
                i++;

                if (i !== j) {
                    [a[i], a[j]] = [a[j], a[i]];
                    r.moves++;

                    r.push(7, `Swap to move ${a[i]} into the left side.`, {
                        swap: [i, j],
                        pivot: hi,
                        range: [lo, hi]
                    });
                }
            }
        }

        const place = i + 1;

        if (place !== hi) {
            [a[place], a[hi]] = [a[hi], a[place]];
            r.moves++;
        }

        r.sorted.add(place);

        r.push(
            10,
            `Put the pivot ${pivot} in its final position, ${place}. Smaller values are on its left, bigger ones on its right.`,
            {
                swap: place !== hi ? [place, hi] : [],
                pivot: place,
                range: [lo, hi]
            }
        );

        sort(lo, place - 1);
        sort(place + 1, hi);
    };

    sort(0, a.length - 1);

    return r.finish("Done: the array is sorted.");
};


// ===== Searching =====

const linearSearch = (input, target) => {
    const r = new Recorder(
        input,
        `Start: we will check the values one by one, looking for ${target}.`
    );
    const a = r.array;
    const n = a.length;

    for (let i = 0; i < n; i++) {
        r.comparisons++;

        if (a[i] === target) {
            r.push(
                2,
                `${a[i]} equals ${target}: found it at position ${i} after ${i + 1} ${i === 0 ? "check" : "checks"}!`,
                {
                    found: i,
                    range: [i, n - 1],
                    pointers: [{ index: i, label: "i" }]
                }
            );

            return r.steps;
        }

        r.push(1, `Is ${a[i]} equal to ${target}? No, move on to the next value.`, {
            compare: [i],
            range: [i, n - 1],
            pointers: [{ index: i, label: "i" }]
        });
    }

    r.push(5, `All ${n} values were checked and ${target} is not in the array.`, {
        range: [n, n - 1]
    });

    return r.steps;
};

const binarySearch = (input, target) => {
    const sorted = [...input].sort((x, y) => x - y);
    const r = new Recorder(
        sorted,
        "Binary search needs sorted data, so the values are sorted first."
    );
    const a = r.array;
    const n = a.length;

    let low = 0;
    let high = n - 1;

    const pointers = (mid) => {
        const list = [];

        if (low >= 0 && low < n) list.push({ index: low, label: "low" });
        if (mid !== undefined) list.push({ index: mid, label: "mid" });
        if (high >= 0 && high < n) list.push({ index: high, label: "high" });

        return list;
    };

    r.push(
        0,
        `Start with the whole array: low = ${low}, high = ${high}. We are looking for ${target}.`,
        { range: [low, high], pointers: pointers() }
    );

    while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);

        r.comparisons++;

        r.push(2, `Look at the middle: position ${mid} holds ${a[mid]}.`, {
            compare: [mid],
            range: [low, high],
            pointers: pointers(mid)
        });

        if (a[mid] === target) {
            r.push(3, `${a[mid]} equals ${target}: found it at position ${mid}!`, {
                found: mid,
                range: [low, high],
                pointers: pointers(mid)
            });

            return r.steps;
        }

        if (a[mid] < target) {
            low = mid + 1;

            r.push(
                4,
                `${a[mid]} is smaller than ${target}, so the target can only be on the right. Move low to ${low}.`,
                { compare: [mid], range: [low, high], pointers: pointers(mid) }
            );
        } else {
            high = mid - 1;

            r.push(
                5,
                `${a[mid]} is bigger than ${target}, so the target can only be on the left. Move high to ${high}.`,
                { compare: [mid], range: [low, high], pointers: pointers(mid) }
            );
        }
    }

    r.push(
        7,
        `low passed high, so nothing is left to check: ${target} is not in the array.`,
        { range: [low, high], pointers: pointers() }
    );

    return r.steps;
};


// ===== The list of algorithms =====

export const ALGORITHMS = {
    bubble: {
        key: "bubble",
        name: "Bubble sort",
        type: "sort",
        moveLabel: "Swaps",
        description:
            "Compares neighbouring values and swaps them when they are out of order. After each pass the biggest remaining value bubbles to the end.",
        complexity: {
            best: "O(n)",
            average: "O(n²)",
            worst: "O(n²)",
            space: "O(1)"
        },
        stable: true,
        code: [
            "for (int i = 0; i < n - 1; i++) {",
            "    boolean swapped = false;",
            "    for (int j = 0; j < n - 1 - i; j++) {",
            "        if (a[j] > a[j + 1]) {",
            "            swap(a, j, j + 1);",
            "            swapped = true;",
            "        }",
            "    }",
            "    if (!swapped) break;",
            "}"
        ],
        run: bubbleSort
    },
    selection: {
        key: "selection",
        name: "Selection sort",
        type: "sort",
        moveLabel: "Swaps",
        description:
            "Finds the smallest value in the unsorted part and swaps it to the front, one position at a time.",
        complexity: {
            best: "O(n²)",
            average: "O(n²)",
            worst: "O(n²)",
            space: "O(1)"
        },
        stable: false,
        code: [
            "for (int i = 0; i < n - 1; i++) {",
            "    int min = i;",
            "    for (int j = i + 1; j < n; j++) {",
            "        if (a[j] < a[min]) {",
            "            min = j;",
            "        }",
            "    }",
            "    swap(a, i, min);",
            "}"
        ],
        run: selectionSort
    },
    insertion: {
        key: "insertion",
        name: "Insertion sort",
        type: "sort",
        moveLabel: "Swaps",
        description:
            "Builds a sorted section from the left. Each new value slides left until it reaches its place, like sorting playing cards in your hand.",
        complexity: {
            best: "O(n)",
            average: "O(n²)",
            worst: "O(n²)",
            space: "O(1)"
        },
        stable: true,
        code: [
            "for (int i = 1; i < n; i++) {",
            "    int j = i;",
            "    while (j > 0 && a[j - 1] > a[j]) {",
            "        swap(a, j - 1, j);",
            "        j--;",
            "    }",
            "}"
        ],
        run: insertionSort
    },
    merge: {
        key: "merge",
        name: "Merge sort",
        type: "sort",
        moveLabel: "Writes",
        description:
            "Splits the array in halves, sorts each half, then merges them back together. Fast and predictable, but it needs extra memory.",
        complexity: {
            best: "O(n log n)",
            average: "O(n log n)",
            worst: "O(n log n)",
            space: "O(n)"
        },
        stable: true,
        code: [
            "void mergeSort(int[] a, int lo, int hi) {",
            "    if (lo >= hi) return;",
            "    int mid = (lo + hi) / 2;",
            "    mergeSort(a, lo, mid);",
            "    mergeSort(a, mid + 1, hi);",
            "    merge(a, lo, mid, hi);",
            "}",
            "// merge(): copy both halves, then repeat:",
            "//   compare the front value of each half",
            "//   write the smaller one back into a[k]"
        ],
        run: mergeSort
    },
    quick: {
        key: "quick",
        name: "Quick sort",
        type: "sort",
        moveLabel: "Swaps",
        description:
            "Picks a pivot, moves smaller values to its left and bigger ones to its right, then repeats on both sides.",
        complexity: {
            best: "O(n log n)",
            average: "O(n log n)",
            worst: "O(n²)",
            space: "O(log n)"
        },
        stable: false,
        code: [
            "void quickSort(int[] a, int lo, int hi) {",
            "    if (lo >= hi) return;",
            "    int pivot = a[hi];",
            "    int i = lo - 1;",
            "    for (int j = lo; j < hi; j++) {",
            "        if (a[j] < pivot) {",
            "            i++;",
            "            swap(a, i, j);",
            "        }",
            "    }",
            "    swap(a, i + 1, hi);",
            "    quickSort(a, lo, i);",
            "    quickSort(a, i + 2, hi);",
            "}"
        ],
        run: quickSort
    },
    linear: {
        key: "linear",
        name: "Linear search",
        type: "search",
        description:
            "Checks every value from the start until it finds the target. It works on any array, sorted or not.",
        complexity: {
            best: "O(1)",
            average: "O(n)",
            worst: "O(n)",
            space: "O(1)"
        },
        requiresSorted: false,
        code: [
            "for (int i = 0; i < n; i++) {",
            "    if (a[i] == target) {",
            "        return i;",
            "    }",
            "}",
            "return -1;"
        ],
        run: linearSearch
    },
    binary: {
        key: "binary",
        name: "Binary search",
        type: "search",
        description:
            "Looks at the middle value and throws away the half that cannot contain the target. It needs a sorted array and is very fast.",
        complexity: {
            best: "O(1)",
            average: "O(log n)",
            worst: "O(log n)",
            space: "O(1)"
        },
        requiresSorted: true,
        code: [
            "int low = 0, high = n - 1;",
            "while (low <= high) {",
            "    int mid = low + (high - low) / 2;",
            "    if (a[mid] == target) return mid;",
            "    else if (a[mid] < target) low = mid + 1;",
            "    else high = mid - 1;",
            "}",
            "return -1;"
        ],
        run: binarySearch
    }
};

export const ALGORITHM_GROUPS = [
    {
        label: "Sorting",
        keys: ["bubble", "selection", "insertion", "merge", "quick"]
    },
    {
        label: "Searching",
        keys: ["linear", "binary"]
    }
];


// ===== Building the steps =====

export const generateSteps = (key, input, target) => {
    const algorithm = ALGORITHMS[key];

    // A search needs a valid target
    if (algorithm.type === "search" && target === null) {
        const shown = algorithm.requiresSorted
            ? [...input].sort((x, y) => x - y)
            : input;

        return new Recorder(
            shown,
            "Type a whole number from 1 to 99 as the target to search for."
        ).steps;
    }

    const steps = algorithm.run(input, target);

    // Safety check: a sort must really end with a sorted array
    if (algorithm.type === "sort") {
        const expected = [...input].sort((x, y) => x - y);
        const result = steps[steps.length - 1].array;

        if (expected.some((value, index) => value !== result[index])) {
            console.error(`${algorithm.name} did not produce a sorted array.`);
        }
    }

    return steps;
};


// ===== Finding an algorithm in a chat reply =====

const DETECTORS = [
    { key: "binary", pattern: /\bbinary\s*search/gi },
    { key: "linear", pattern: /\b(?:linear|sequential)\s*search/gi },
    { key: "bubble", pattern: /\bbubble\s*sort/gi },
    { key: "selection", pattern: /\bselection\s*sort/gi },
    { key: "insertion", pattern: /\binsertion\s*sort/gi },
    { key: "merge", pattern: /\bmerge\s*sort/gi },
    { key: "quick", pattern: /\bquick\s*sort/gi }
];

// Returns the key of the algorithm a text talks about most, or null
export const detectAlgorithm = (text) => {
    if (typeof text !== "string" || !text) return null;

    let best = null;
    let bestCount = 0;

    for (const { key, pattern } of DETECTORS) {
        const matches = text.match(pattern);
        const count = matches ? matches.length : 0;

        if (count > bestCount) {
            best = key;
            bestCount = count;
        }
    }

    return best;
};