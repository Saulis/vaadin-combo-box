'use strict';
var args = require('yargs').argv;
var chalk = require('chalk');
var wct = require('web-component-tester').test;
var Steps = require('web-component-tester').steps;
var gulp = require('gulp');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');
var htmlExtract = require('gulp-html-extract');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var typings = require('gulp-typings');
var ngrok = require('ngrok');

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
  test(
    {
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

function testNgrok(browsers, done) {
  ngrok.connect(2000, function(err, url) {
    console.log('Tunnel Opened: ', url);
    var runTests = Steps.runTests;
    // well here's a nice monkey patch to override the urls that are sent
    // over to the browser to open:
    Steps.runTests = function(context, dne) {
      context.options.webserver.port = 80;
      context.options.webserver.hostname = url.replace('https://', '');
      return runTests(context, dne);
    };
    test({
        expanded: false,
        activeBrowsers: browsers,
        plugins: ['local'],
        browserOptions: {
          name: localAddress() + ' / ' + new Date(),
          build: 'vaadin-combo-box',
          url: {
            accessKey: 'sFuZuV3BKTELueK7gqkN',
            hostname:  'hub-cloud.browserstack.com',
            port:      80,
            username:  'saulithkp1',
          }
        },
        extraScripts: args.dom === 'shadow' ? ['test/enable-shadow-dom.js'] : [],
        root: '.',
        webserver: {
          port: 2000,
          hostname: localAddress()
        }
      }, function(err) {
        ngrok.kill();
        console.log('Tunnel Closed: ', url);
        done(err);
      });
  });
}

gulp.task('test:desktop', function(done) {
  testNgrok([
    desktopBrowser('chrome', 'Windows', '55.0'),
    // desktopBrowser('firefox', 'Windows 10', '49'),
    // desktopBrowser('safari', 'OSX 10.11', '10.0'),
    // desktopBrowser('MicrosoftEdge', 'Windows 10', '14.14393'),
    // desktopBrowser('internet explorer', 'Windows 10', '11')
    ], done);
});

var iosBrowser = function(name, version) {
  return {
    // appiumVersion: '1.6.0',
    // deviceName: name,
    // deviceOrientantion: 'portrait',
    // platformVersion: version,
    // platformName: 'iOS',
    // browserName: 'Safari',
    // recordVideo: false,
    // recordScreenshots: false
   'browserName' : name,
   'platform' : 'MAC',
   'device' : version
  };
};

var androidBrowser = function(name, version) {
  return {
    // browserName: 'Browser',
    // appiumVersion: '1.5.3',
    // deviceName: name,
    // deviceOrientation: 'portrait',
    // platformVersion: version,
    // platformName: 'Android'
    'browserName' : 'android',
    'platform' : 'ANDROID',
    'device' : name

  };
};

var desktopBrowser = function(name, version, platform) {
  return {
    'browserName' : 'android',
     'platform' : 'ANDROID',
     'device' : 'Google Nexus 5'
     };
};

gulp.task('test:legacy', function(done) {
  testNgrok([
    iosBrowser('iPhone 6 Simulator', '9.3'),
    iosBrowser('iPad Retina Simulator', '9.3'),
    desktopBrowser('safari', 'OSX 10.11', '9.0')
  ], done);
});

gulp.task('test:mobile', function(done) {
  testNgrok([
    androidBrowser('Google Nexus 5'),
    iosBrowser('iPhone', 'iPhone 6S'),
    iosBrowser('iPad', 'iPad Air 2'),
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
        sel: 'script, code-example code',
        strip: true
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

  testNgrok([
    'Windows 10/chrome@54',
    'Windows 10/firefox@48',
    'Windows 10/microsoftedge@13',
    'Windows 10/internet explorer@11',
    'OS X 10.11/safari@9.0'
    ], done);
});

gulp.task('test:mobile:shadow', function(done) {
  args.dom = 'shadow';

  testNgrok([
    'OS X 10.11/iphone@9.2',
    'OS X 10.11/ipad@9.2',
    'Linux/android@5.1'], done);
});

gulp.task('typings', function() {
  return gulp.src('test/angular2/typings.json')
    .pipe(typings());
});

gulp.task('ng2', ['typings'], function() {
  ['test/angular2'].forEach(function(dir) {
    gulp.src([dir + '/*.ts', 'test/angular2/typings/main/**/*.d.ts'])
      .pipe(sourcemaps.init())
      .pipe(ts(ts.createProject('test/angular2/tsconfig.json')))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(dir));
  });
});

gulp.task('ng2:watch', function() {
  gulp.watch('test/angular2/*.ts', ['ng2']);
});
