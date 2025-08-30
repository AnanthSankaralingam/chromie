// Mock data for git-diff-utils tests

const OLD_CONTENT = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

module.exports = {
  calculateTotal
};
`;

const NEW_CONTENT = `// Add tax calculation
function calculateTotal(items, taxRate = 0.1) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price;
  }
  const tax = subtotal * taxRate;
  return subtotal + tax;
}

module.exports = {
  calculateTotal
};
`;

module.exports = {
  OLD_CONTENT,
  NEW_CONTENT,
};