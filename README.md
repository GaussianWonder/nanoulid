# nanoulid

A 17 character ULID generator capable of monotonicity.

## ULID stats

```text
0gzfy095vgvrdcc_o
0gzfy0g0837o0rte6
```

1. Timestamp
   - 46 bits precision, lasting until `4199-11-24T01:22:57.663Z`
   - encoded in 9 characters
   - 265K IDs needed in order to have a 1% probability of at least one collision for each millisecond
2. Random data
   - encoded in 8 characters
3. Monotonicity
   - this can benefit of some upgrades, currently it just alphabetically increases by 1
4. Lexicographically sortable
   - Time-based sort order
   - Can be used as a better UUID for most usecases
