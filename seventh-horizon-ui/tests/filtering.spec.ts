name: ci

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Python deps
        run: |
          python -m pip install -U pip setuptools
          python -m pip install -e .

      - name: Run pytest
        run: pytest -q

  e2e:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install UI deps
        working-directory: seventh-horizon-ui
        run: npm ci

      - name: Install Playwright browsers
        working-directory: seventh-horizon-ui
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        working-directory: seventh-horizon-ui
        run: npx playwright test --reporter=line

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: e2e
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build UI
        working-directory: seventh-horizon-ui
        run: |
          npm ci
          npm run build

      - name: Upload Pages artifact (single)
        uses: actions/upload-pages-artifact@v3
        with:
          path: seventh-horizon-ui/dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
