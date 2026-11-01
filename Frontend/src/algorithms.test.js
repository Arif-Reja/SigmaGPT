import test from "node:test";
import assert from "node:assert/strict";
import {
    ALGORITHMS,
    detectAlgorithm,
    generateSteps,
    makeArray,
    parseNumberList,
    parseTarget
} from "./algorithms.js";

const SORTS = ["bubble", "selection", "insertion", "merge", "quick"];
const sortedCopy = (array) => [...array].sort((a, b) => a - b);

for (const key of SORTS) {
    test(`${ALGORITHMS[key].name} sorts every kind of array`, () => {
        for (const kind of ["random", "nearly", "reversed", "few"]) {
            for (let round = 0; round < 20; round++) {
                const input = makeArray(kind, 5 + (round % 20));
                const steps = generateSteps(key, input, null);

                assert.deepEqual(steps.at(-1).array, sortedCopy(input));
            }
        }
    });
}

test("Binary search finds every value and reports a missing one", () => {
    const input = [5, 12, 19, 23, 42, 57, 88];

    for (const target of input) {
        const last = generateSteps("binary", input, target).at(-1);

        assert.equal(last.array[last.found], target);
    }

    assert.equal(generateSteps("binary", input, 50).at(-1).found, null);
});

test("Linear search works on unsorted data", () => {
    const input = [42, 7, 19, 3, 88];
    const last = generateSteps("linear", input, 19).at(-1);

    assert.equal(last.found, 2);
    assert.equal(generateSteps("linear", input, 50).at(-1).found, null);
});

test("Input helpers accept good values and reject bad ones", () => {
    assert.deepEqual(parseNumberList("5, 3, 9", 10).values, [5, 3, 9]);
    assert.ok(parseNumberList("5", 10).error);
    assert.ok(parseNumberList("5, 100", 10).error);
    assert.equal(parseTarget("42"), 42);
    assert.equal(parseTarget("abc"), null);
    assert.equal(parseTarget("100"), null);
});

test("detectAlgorithm picks the algorithm a text talks about most", () => {
    assert.equal(
        detectAlgorithm("Binary search is fast. Binary search needs sorted data."),
        "binary"
    );
    assert.equal(detectAlgorithm("Nothing relevant here."), null);
});