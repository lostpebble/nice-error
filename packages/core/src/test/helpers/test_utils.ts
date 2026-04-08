export const isVal = <T>(input: unknown, val: T): input is T => {
  if (input !== val) {
    throw new Error(`Assertion failed: expected ${val}, but got ${input}`);
  }

  return true;
};
