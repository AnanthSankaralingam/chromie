const { parseMarkdown } = require('../../src/components/ui/chat/markdown-parser.js')

function assert(name, condition) {
  if (!condition) {
    console.error(`✖ ${name}`)
    process.exitCode = 1
  } else {
    console.log(`✔ ${name}`)
  }
}

function containsStrayTag(html) {
  return /<(\/?strong|\/?code)(\s|>)/.test(html) && !/<strong class=/.test(html)
}


function testBasicGreeting() {
  const input = "hi! i'm **chromie**, your chrome extension assistant. tell me what you'd like in your extension."
  const out = parseMarkdown(input)
  assert('greeting renders bold without stray tags', /<strong/.test(out) && /chromie/.test(out) && !containsStrayTag(out))
}

function testStrayStrongClose() {
  const input = "hi! i'm chromie</strong>, your chrome extension assistant."
  const out = parseMarkdown(input)
  assert('stray closing strong removed', !containsStrayTag(out))
}

function testEscapedBr() {
  const input = "Designing your extension...\n\n< br />"
  const out = parseMarkdown(input)
  assert('escaped br normalized', /<br \/>/.test(out) && !/&lt;\s*br/.test(out))
}

function testInlineCodeClose() {
  const input = "background.js</code>"
  const out = parseMarkdown(input)
  assert('stray code close removed', !containsStrayTag(out))
}

function run() {
  testBasicGreeting()
  testStrayStrongClose()
  testEscapedBr()
  testInlineCodeClose()
}

run()


