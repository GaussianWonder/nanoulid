import { customAlphabet } from "npm:nanoid";

/**
 * https://zelark.github.io/nano-id-cc/
 * 37 characters url-friendly alphabet, single select by cursor clicking, order is important
 *
 * Don't change the alphabet, it will change the lengths of the ids resulting in all types of database problems.
 *
 * ! Don't change this constant
 */
const ALPHABET = "0123456789_abcdefghijklmnopqrstuvwxyz";
/**
 * This is used to generate the random bits of the uid.
 *
 * ! Don't change this constant
 */
const UIDGen = customAlphabet(ALPHABET);

/**
 * 46 bits of timestamp precision, lasting until `4199-11-24T01:22:57.663Z`
 *
 * ```ts
 * new Date(Math.pow(2, 46) - 1).getTime()
 * ```
 *
 * Expected max length of 9 characters when encoded with the alphabet above: `0gzfxyzz3`, `j19fatwen`
 *
 * ! Don't change this constant
 */
const MAX_TIME = 70368744177663;
/**
 * Given the constant alphabet, this is the expected length of the timestamp up to year 6429.
 *
 * ! Don't change this constant
 */
const TIME_LENGTH = 9;
/**
 * Expected max length of the random part of the UID when encoded with the alphabet above.
 *
 * ! Don't change this constant
 */
const RANDOM_LENGTH = 8;

/**
 * Fastest reverse string.
 * 1.9M ops/s ± 5.18% tested on strings of higher lengths than expected in this context.
 */
function reverseString(str: string) {
  return str
    .split("")
    .reduce((reversed, character) => character + reversed, "");
}

/**
 * Fastest implementation of replace char at I could come up with.
 * Not benchmarked.
 */
function replaceCharAt(str: string, index: number, char: string) {
  if (index > str.length - 1) return str;
  return str.slice(0, index) + char + str.slice(index + char.length);
}

/**
 * Encode a number in the base of the alphabet length.
 * 3.4M ops/s ± 6.82%
 */
function encode(n: number, alphabet: string): string {
  const base = alphabet.length;
  if (n === 0) {
    return alphabet[0];
  }

  let str = "";
  while (n) {
    const r = n % base;
    n = Math.floor(n / base);
    str += alphabet[r];
  }

  return reverseString(str);
}

/**
 * Decode a number which was encoded using this alphabet.
 * 3.5M ops/s ± 7.32%
 */
function decode(str: string, alphabet: string): number {
  const base = alphabet.length;
  let ans = 0,
    m = 1;
  for (const char of reverseString(str)) {
    ans += alphabet.indexOf(char) * m;
    m *= base;
  }
  return ans;
}

/**
 * Generate a UID with a seeded timestamp and configurable random length.
 *
 * Example using default params:
 *
 * ```text
 * 0gzfy095vgvrdcc_o
 * 0gzfy0g0837o0rte6
 * ```
 */
function genUID(time: number = Date.now(), random = RANDOM_LENGTH) {
  const prefix = encode(time, ALPHABET).padStart(TIME_LENGTH, ALPHABET[0]);
  const uid = UIDGen(random);
  return prefix + uid;
}

/**
 * Not ideal, but working solution for monotonic incrementing of the UID.
 *
 * This is to solve the problem of lexicographical ordering of the UIDs that were generated
 * in the same millisecond.
 *
 * Example:
 *
 * ```text
 * 0gzfy0hpvbcojf7hx
 * 0gzfy0hpvbcojf7hy
 * ```
 */
function incrementAlphabet(uid: string, alphabet: string): string {
  let done: string | undefined = undefined;
  let index = uid.length;
  let char: string;
  let charIndex: number;
  const maxCharIndex = alphabet.length - 1;
  while (!done && index-- >= 0) {
    char = uid[index];
    charIndex = alphabet.indexOf(char);
    if (charIndex === -1) {
      throw new Error("incorrectly encoded uid");
    }
    if (charIndex === maxCharIndex) {
      uid = replaceCharAt(uid, index, alphabet[0]);
      continue;
    }
    done = replaceCharAt(uid, index, alphabet[charIndex + 1]);
  }
  if (typeof done === "string") return done;
  throw new Error("cannot increment uid");
}

/**
 * Generate one UID.
 *
 * This does not handle the case of multiple UIDs generated in the same millisecond.
 *
 * If you just want random uids, use `monotonicGen` instead.
 *
 * Default expected UID length: 17
 */
export function unsafeMakeUID() {
  return genUID();
}

/**
 * Generate multiple UIDs.
 *
 * This does not handle the case of multiple UIDs generated in the same millisecond in different call contexts such as promises or async functions.
 *
 * It is however quaranteed that these UIDs are monotonically increasing, it is just not quaranteed that other async calls to this function in parallel retain the same property.
 *
 * If you just want random uids, use `monotonicGen` instead.
 *
 * Default expected UID length: 17
 */
export function unsafeMakeUIDs(count = 1) {
  let uid = genUID();
  return new Array(count).fill(undefined).map(() => {
    uid = incrementAlphabet(uid, ALPHABET);
    return uid;
  });
}

/**
 * A random monotonic UID generator factory.
 *
 * This can be used in async and parallel contexts to generate UIDs that are quaranteed to be monotonically increasing at the same millisecond across all callers.
 *
 * Default expected UID length: 17
 * Default random length: 8
 *
 * Example:
 *
 * ```text
 * 0RJOWmu_GZPkvMUB 0RJOWmuar4IVQTOM 0RJOWmuar4IVQTON
 * 0RJOYlFK541u3718 0RJOYlFLJuh287QZ 0RJOYlFLJuh287Q_
 * ```
 *
 * # Notes
 *
 * Input the uid length of 8 and the alphabet constant above in this [nanoid calculator](https://zelark.github.io/nano-id-cc/).
 *
 * The speed output parameter in this calculator is irrelevant for this use case because the timestamp is encoded in the UID, as such it is true that this supports up to `265K ID` per millisecond until you have a 1% chance of collision.
 */
export const MonotonicUIDGenerator = () => {
  let lastTimestamp: number | undefined = undefined;
  let lastUID: string | undefined = undefined;

  return () => {
    const now = Date.now();

    if (lastTimestamp === undefined || lastUID === undefined) {
      lastTimestamp = now;
      lastUID = genUID(now);
      return lastUID;
    }

    if (now === lastTimestamp) {
      lastUID = incrementAlphabet(lastUID, ALPHABET);
      return lastUID;
    }

    lastTimestamp = now;
    lastUID = genUID(now);
    return lastUID;
  };
};

/**
 * A global random monotonic UID generator.
 *
 * It is recommended to use this in most cases, but you can also create your own instance of the generator using `MonotonicUIDGenerator`.
 *
 * You can also create an injectable provider with a per Request scope to handle monotonically increasing UIDs in a request context.
 */
export const makeUID = MonotonicUIDGenerator();
