install: # install dependencies
	npm ci

publish:
	npm publish --dry-run

lint:
	npx eslint .

test:
	npx jest

test-coverage:
	npx jest --coverage

page-loader:
	node bin/pageLoader.js

.PHONY: test