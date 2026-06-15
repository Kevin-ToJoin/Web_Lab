import '@testing-library/jest-dom'

// Keep tests isolated: clear persisted state (cart, bug reports) before each test.
beforeEach(() => {
  localStorage.clear()
})
