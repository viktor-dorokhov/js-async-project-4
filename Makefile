install: # install dependencies
	npm ci

publish:
	npm publish --dry-run

lint:
	npx eslint .

test:
	npm test

test-coverage:
	npm test --coverage

test-debug:
	DEBUG=page-loader npm test

test-debug-axios:
	DEBUG=axios npm test

test-debug-nock:
	DEBUG=nock.* npm test

page-loader:
	node bin/pageLoader.js

.PHONY: test