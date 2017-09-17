const childProcess = require('child_process')
const util = require('util')

const execAsync = util.promisify(childProcess.exec)

module.exports = {
  build: [
    `rimraf dist`,
    `mkdirp dist`,
    {
      copy: [
        `cpy ./node_modules/bootstrap/dist/css/bootstrap.min.css ./demo/css/`,
        `cpy ./node_modules/font-awesome/css/font-awesome.min.css ./demo/css/`,
        `cpy ./node_modules/dragula/dist/dragula.min.css ./demo/css/`,
        `cpy ./node_modules/font-awesome/fonts/*.* ./demo/fonts`,
        `cpy ./node_modules/highlight.js/styles/default.css ./demo/css/highlight.js/`,
        `cpy ./node_modules/markdown-tip/markdown-tip.css ./demo/css/`,
        `cpy ./node_modules/github-fork-ribbon-css/gh-fork-ribbon.css ./demo/css/`,
        `cpy ./node_modules/select2-component/select2.min.css ./demo/css/`,
        `cpy src/lib.d.ts dist`,
        `cpy src/libs.d.ts dist`
      ],
      version: [
        {
          js: [
            {
              vue: `file2variable-cli src/vue/*.template.html src/vue.template.html -o src/vue-variables.ts --html-minify --base src`,
              angular: `file2variable-cli src/angular/*.template.html src/angular.template.html -o src/angular-variables.ts --html-minify --base src`
            },
            `ngc -p src`,
            `tsc -p demo`,
            `webpack --display-modules --config demo/webpack.config.js`
          ],
          clean: `rimraf demo/**/*.bundle-*.js`
        },
        `rev-static --config demo/rev-static.config.js`
      ]
    },
    async () => {
      const { createServer } = require('http-server')
      const puppeteer = require('puppeteer')
      const fs = require('fs')
      const beautify = require('js-beautify').html
      const server = createServer()
      server.listen(8000)
      const browser = await puppeteer.launch()
      const page = await browser.newPage()
      await page.emulate({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36' })
      for (const type of ['vue', 'react', 'angular']) {
        await page.goto(`http://localhost:8000/demo/${type}`)
        await page.screenshot({ path: `demo/${type}/screenshot.png`, fullPage: true })
        const content = await page.content()
        fs.writeFileSync(`demo/${type}/screenshot-src.html`, beautify(content))
      }
      server.close()
      browser.close()
    }
  ],
  lint: {
    ts: `tslint "src/**/*.tsx" "demo/**/*.tsx" "src/**/*.ts" "demo/**/*.ts" "spec/**/*.ts"`,
    js: `standard "**/*.config.js"`,
    export: `no-unused-export "src/**/*.tsx" "demo/**/*.tsx" "src/**/*.ts" "demo/**/*.ts" "spec/**/*.ts" --exclude "src/compiled/**/*"`
  },
  test: [
    'tsc -p spec',
    'karma start spec/karma.config.js',
    'git checkout demo/vue/screenshot.png',
    'git checkout demo/react/screenshot.png',
    'git checkout demo/angular/screenshot.png',
    async () => {
      const { stdout } = await execAsync('git status -s')
      if (stdout) {
        console.log(stdout)
        throw new Error(`generated files doesn't match.`)
      }
    }
  ],
  fix: {
    ts: `tslint --fix "src/**/*.tsx" "demo/**/*.tsx" "src/**/*.ts" "demo/**/*.ts" "spec/**/*.ts"`,
    js: `standard --fix "**/*.config.js"`
  },
  release: `clean-release`,
  watch: {
    vue: `file2variable-cli src/vue/*.template.html src/vue.template.html -o src/vue-variables.ts --html-minify --base src --watch`,
    angular: `file2variable-cli src/angular/*.template.html src/angular.template.html -o src/angular-variables.ts --html-minify --base src --watch`,
    tsc: `tsc -p src --watch`,
    demo: `tsc -p demo --watch`,
    webpack: `webpack --display-modules --config demo/webpack.config.js --watch`,
    rev: `rev-static --config demo/rev-static.config.js --watch`
  }
}