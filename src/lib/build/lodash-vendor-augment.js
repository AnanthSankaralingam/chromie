/**
 * Pre-bundled lodash is one ESM file with only `export default` (full `_` object).
 * `const { debounce } = require('lodash')` and `import { debounce } from 'lodash'`
 * need named exports; without them those bindings stay undefined at runtime.
 */

export const LODASH_NAMED_EXPORT_METHODS = [
  'add', 'after', 'ary', 'assign', 'assignIn', 'assignInWith', 'assignWith', 'at', 'attempt',
  'before', 'bind', 'bindAll', 'bindKey', 'camelCase', 'capitalize', 'castArray', 'ceil',
  'chain', 'chunk', 'clamp', 'clone', 'cloneDeep', 'cloneDeepWith', 'cloneWith', 'compact',
  'concat', 'cond', 'conformsTo', 'constant', 'countBy', 'create', 'curry', 'curryRight',
  'debounce', 'defaults', 'defaultsDeep', 'defaultTo', 'defer', 'delay', 'difference',
  'differenceBy', 'differenceWith', 'divide', 'drop', 'dropRight', 'dropRightWhile',
  'dropWhile', 'endsWith', 'eq', 'escape', 'escapeRegExp', 'every', 'fill', 'filter',
  'find', 'findIndex', 'findKey', 'findLast', 'findLastIndex', 'findLastKey', 'first',
  'flatMap', 'flatMapDeep', 'flatMapDepth', 'flatten', 'flattenDeep', 'flattenDepth',
  'flip', 'floor', 'flow', 'flowRight', 'forEach', 'forEachRight', 'forIn', 'forInRight',
  'forOwn', 'forOwnRight', 'fromPairs', 'functions', 'functionsIn', 'get', 'groupBy', 'gt',
  'gte', 'has', 'hasIn', 'head', 'identity', 'inRange', 'includes', 'indexOf', 'initial',
  'intersection', 'intersectionBy', 'intersectionWith', 'invert', 'invertBy', 'invoke',
  'invokeMap', 'isArguments', 'isArray', 'isArrayBuffer', 'isArrayLike', 'isArrayLikeObject',
  'isBoolean', 'isBuffer', 'isDate', 'isElement', 'isEmpty', 'isEqual', 'isEqualWith',
  'isError', 'isFinite', 'isFunction', 'isInteger', 'isLength', 'isMap', 'isMatch',
  'isMatchWith', 'isNaN', 'isNative', 'isNil', 'isNull', 'isNumber', 'isObject', 'isObjectLike',
  'isPlainObject', 'isRegExp', 'isSafeInteger', 'isSet', 'isString', 'isSymbol',
  'isTypedArray', 'isUndefined', 'isWeakMap', 'isWeakSet', 'iteratee', 'join', 'kebabCase',
  'keyBy', 'keys', 'keysIn', 'last', 'lastIndexOf', 'lowerCase', 'lowerFirst', 'lt', 'lte',
  'map', 'mapKeys', 'mapValues', 'matches', 'matchesProperty', 'max', 'maxBy', 'mean',
  'meanBy', 'memoize', 'merge', 'mergeWith', 'method', 'methodOf', 'min', 'minBy', 'mixin',
  'multiply', 'negate', 'noConflict', 'noop', 'now', 'nth', 'nthArg', 'omit', 'omitBy',
  'once', 'orderBy', 'over', 'overArgs', 'overEvery', 'overSome', 'pad', 'padEnd',
  'padStart', 'parseInt', 'partial', 'partialRight', 'partition', 'pick', 'pickBy',
  'property', 'propertyOf', 'pull', 'pullAll', 'pullAllBy', 'pullAllWith', 'pullAt',
  'random', 'range', 'rangeRight', 'rearg', 'reduce', 'reduceRight', 'reject', 'remove',
  'repeat', 'replace', 'rest', 'result', 'reverse', 'round', 'runInContext', 'sample',
  'sampleSize', 'set', 'setWith', 'shuffle', 'size', 'slice', 'snakeCase', 'some', 'sortBy',
  'sortedIndex', 'sortedIndexBy', 'sortedIndexOf', 'sortedLastIndex', 'sortedLastIndexBy',
  'sortedLastIndexOf', 'sortedUniq', 'sortedUniqBy', 'split', 'spread', 'startCase',
  'startsWith', 'stubArray', 'stubFalse', 'stubObject', 'stubString', 'stubTrue',
  'subtract', 'sum', 'sumBy', 'tail', 'take', 'takeRight', 'takeRightWhile', 'takeWhile',
  'tap', 'template', 'throttle', 'thru', 'times', 'toArray', 'toFinite', 'toInteger',
  'toLength', 'toLower', 'toNumber', 'toPairs', 'toPairsIn', 'toPath', 'toPlainObject',
  'toSafeInteger', 'toString', 'toUpper', 'transform', 'trim', 'trimEnd', 'trimStart',
  'truncate', 'unary', 'unescape', 'union', 'unionBy', 'unionWith', 'uniq', 'uniqBy',
  'uniqWith', 'uniqueId', 'unset', 'unzip', 'unzipWith', 'update', 'updateWith', 'upperCase',
  'upperFirst', 'values', 'valuesIn', 'without', 'words', 'wrap', 'xor', 'xorBy', 'xorWith',
  'zip', 'zipObject', 'zipObjectDeep', 'zipWith',
]

/**
 * @param {string} source - contents of pre-bundled lodash vendor file
 * @returns {string}
 */
export function augmentLodashVendorModule(source) {
  const m = source.match(/export default (\w+)\(\)\s*;/)
  if (!m) {
    console.warn('[esbuild-service] lodash vendor: could not find `export default <fn>();` — named exports not added')
    return source
  }
  const factory = m[1]
  const lines = [
    `const __chromieLodash = ${factory}();`,
    'export default __chromieLodash;',
    ...LODASH_NAMED_EXPORT_METHODS.map(
      (name) => `export const ${name} = __chromieLodash.${name};`
    ),
  ]
  return source.replace(/export default (\w+)\(\)\s*;/, `${lines.join('\n')}\n`)
}
