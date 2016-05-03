'use strict';
var args = require('yargs').argv;
var chalk = require('chalk');
var wct = require('web-component-tester').test;
var gulp = require('gulp');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');
var htmlExtract = require('gulp-html-extract');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var tsProject = ts.createProject('directives/tsconfig.json');
var typings = require('gulp-typings');

function cleanDone(done) {
  return function(error) {
    if (error) {
      // Pretty error for gulp.
      error = new Error(chalk.red(error.message || error));
      error.showStack = false;
    }
    done(error);
  };
}

function localAddress() {
  var ip, tun, ifaces = require('os').networkInterfaces();
  Object.keys(ifaces).forEach(function(ifname) {
    ifaces[ifname].forEach(function(iface) {
      if ('IPv4' == iface.family && !iface.internal) {
        if (!ip) {
          ip = iface.address;
        }
        if (/tun/.test(ifname)) {
          tun = iface.address;
        }
      }
    });
  });
  return tun || ip;
}

function test(options, done) {
  wct(options, cleanDone(done));
}

function testSauce(browsers, done) {
  test({
    expanded: true,
    browserOptions: {
      name: localAddress() + ' / ' + new Date(),
      build: 'vaadin-combo-box'
    },
    plugins: {
      sauce: {
        username: args.sauceUsername,
        accessKey: args.sauceAccessKey,
        browsers: browsers
      }
    },
    extraScripts: args.dom === 'shadow' ? ['test/enable-shadow-dom.js'] : [],
    root: '.',
    webserver: {
      port: 2000,
      hostname: localAddress()
    }
  }, done);
}

function testBrowserStack(browsers, done) {
  test({
    expanded: true,
    activeBrowsers: [
    // {
    //  "browserName": "iPhone 6S",
    //  "device": "iPhone 6S",
    //  "os": "iOS",
    //  "os_version": "9.1",
    //  "browserstack.local": true
    // },
    {
     //connection refused
     //"platform": "Linux",
     "browserName": "Google Nexus 5",
     "device": "Google Nexus 5",
     'platform' : 'ANDROID',
     //  "device": "Samsung Galaxy S5",
    //  "os": "Linux",
     "emulator": true,
    //  "os_version": "5.0",
     "browserstack.local": true,
     'browserstack.debug': true
   },
    // {
    //   //"platform": "MAC",
    //   //"browserName": "iPhone",
    //   browserName: "safari",
    //   "version": "9",
    //   //"device": "iPhone 5S",
    //   //"device": "Samsung Galaxy S5",
    //   "os": "OSX",
    //   //"emulator": true,
    //   "os_version": "El Capitan",
    //   "browserstack.local": true
    // },
    // {
    //   'browserName': "chrome",
    //   "version": "50",
    //   "os": "Windows",
    //   "os_version": "10",
    //   "browserstack.local": true
    // },
    // {
    //   browserName: "firefox",
    //   "version": "45",
    //   "os": "Windows",
    //   "os_version": "10",
    //   "browserstack.local": true
    // },
    // {
    //   browserName: "internet explorer",
    //   "version": "11",
    //   "os": "Windows",
    //   "os_version": "10",
    //   "browserstack.local": true
    // }
    ],
    browserOptions: {
      name: localAddress() + ' / ' + new Date(),
      build: 'vaadin-combo-box',
      url: 'http://saulithkp1:sFuZuV3BKTELueK7gqkN@hub.browserstack.com:80/wd/hub',
      // 'browserName': 'firefox',
      // 'browserstack.local': true,
      // 'browserstack.user': 'saulithkp1',
      // 'browserstack.key': 'sFuZuV3BKTELueK7gqkN'
    },
    extraScripts: args.dom === 'shadow' ? ['test/enable-shadow-dom.js'] : [],
    root: '.',
    webserver: {
      port: 2000,
      hostname: localAddress()
    }
  }, done);
}

gulp.task('test:bs', function(done) {
  testBrowserStack(['Windows 10/chrome@48'], done);
});

gulp.task('test:desktop', function(done) {
  testSauce([
    'Windows 10/chrome@48',
    'Windows 10/firefox@44',
    'Windows 10/microsoftedge@13',
    'Windows 10/internet explorer@11',
    'OS X 10.11/safari@9.0'
  ], done);
});

gulp.task('test:mobile', function(done) {
  testSauce([
    'OS X 10.11/iphone@9.2',
    'OS X 10.11/ipad@9.2',
    'Linux/android@5.1'
  ], done);
});

gulp.task('lint:js', function() {
  return gulp.src([
      '*.js',
      'test/*.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter())
    .pipe(jshint.reporter('fail'))
    .pipe(jscs())
    .pipe(jscs.reporter())
    .pipe(jscs.reporter('fail'));
});

gulp.task('lint:html', function() {
  return gulp.src([
      '*.html',
      'demo/*.html',
      'test/*.html'
    ])
    .pipe(htmlExtract({
      sel: 'script, code-example code'
    }))
    .pipe(jshint())
    .pipe(jshint.reporter())
    .pipe(jshint.reporter('fail'))
    .pipe(jscs())
    .pipe(jscs.reporter())
    .pipe(jscs.reporter('fail'));
});

gulp.task('test:desktop:shadow', function(done) {
  args.dom = 'shadow';

  testSauce([
    'Windows 10/chrome@48',
    'Windows 10/firefox@44',
    'Windows 10/microsoftedge@13',
    'Windows 10/internet explorer@11',
    'OS X 10.11/safari@9.0'
  ], done);
});

gulp.task('test:mobile:shadow', function(done) {
  args.dom = 'shadow';

  testSauce([
    'OS X 10.11/iphone@9.2',
    'OS X 10.11/ipad@9.2',
    'Linux/android@5.1'
  ], done);
});

gulp.task('typings', function() {
  return gulp.src('directives/typings.json')
    .pipe(typings());
});

gulp.task('ng2', ['typings'], function() {
  return gulp.src(['directives/*.ts', 'directives/typings/main/**/*.d.ts'])
    .pipe(sourcemaps.init())
    .pipe(ts(tsProject))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('directives'));
});
