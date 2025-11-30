// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom doesn't implement ResizeObserver which Recharts' ResponsiveContainer uses.
// Provide a minimal mock so tests that render charts don't fail.
class ResizeObserver {
	constructor(callback) {
		this.callback = callback;
	}
	observe() {}
	unobserve() {}
	disconnect() {}
}

global.ResizeObserver = global.ResizeObserver || ResizeObserver;
