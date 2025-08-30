function assertEqual(actual, expected, message = 'Values are not equal') {
  if (actual !== expected) {
    throw new Error(`${message}:\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
  }
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

module.exports = { assertEqual, assert };


