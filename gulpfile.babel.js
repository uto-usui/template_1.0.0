/**
 * Create paths and import packages
 *
 * いろんなところにパスを通す。
 * パッケージを読み込む。
 *
 */
const gulp = require('gulp'),

      //
      // path
      // - - - - - - - - - -
      docs = '.',
      //
      distDir =  docs + '/dist',
      srcDir =  docs + '/src',
      //
      srcAssetsDir = srcDir + '/assets',
      distAssetsDir = distDir + '/assets',
      //
      srcPath = {
        'imgPath': srcAssetsDir + '/images',
        'sassPath': srcAssetsDir + '/sass',
        'cssPath': srcAssetsDir + '/css',
        'jsPath': srcAssetsDir + '/js'
      },
      distPath = {
        'imgPath': distAssetsDir + '/images',
        'sassPath': distAssetsDir + '/sass',
        'cssPath': distAssetsDir + '/css',
        'jsPath': distAssetsDir + '/js'
      },

      //
      // common
      // - - - - - - - - -
      plumber = require('gulp-plumber'), // error escape
      rename = require('gulp-rename'), // rename
      sourcemaps = require('gulp-sourcemaps'), // sourcemap
      gulpSequence = require('gulp-sequence'), // sequence
      notify = require('gulp-notify'), // alert
      watch = require("gulp-watch"),  // watch
      del = require('del'), // delete
      fs = require('graceful-fs'), // JSON load
      cache = require('gulp-cached'), // cache

      //
      // CSS
      // - - - - - - - - -
      autoprefixer = require('gulp-autoprefixer'), // prefix
      sass = require('gulp-compass'), // Sass compass
      csscomb = require('gulp-csscomb'), // css
      cssmin = require('gulp-cssmin'), // css min
      frontnote = require('gulp-frontnote'), // style guide

      //
      // JavaScript
      // - - - - - - - - -
      uglify = require('gulp-uglify'), // js min
      babel = require('gulp-babel'), // es6
      concat = require('gulp-concat'), // concat ... order.JSON
      eslint = require('gulp-eslint'), // eslint

      //
      // HTML
      // - - - - - - - - -
      ejs = require('gulp-ejs'), // ejs template
      minifyHtml = require('gulp-minify-html'), // html min
      browser = require('browser-sync'), // browser start

      //
      // image
      // - - - - - - - - -
      imagemin = require('gulp-imagemin'), // image min
      pngquant = require('imagemin-pngquant');


/**
 * Start the server
 *
*/
gulp.task('browser', () => {
  browser({ server: { baseDir: distDir + '/' } });
});


/**
 * CSS task
 *
 * Convert Sass (SCSS) to CSS. (Compass)
 * Generate a style guide.(frontnote)
 * Execute autoprefixer.
 * Format the order of CSS properties.
 * Save it temporarily, compress it, rename it, resave it.
 * Reload the browser.
 *
 * Sass(SCSS)をCSSに変換する。(compass)
 * スタイルガイドを生成する。(frontnote)
 * autoprefixerを実行する。
 * CSSプロパティの並び順を整形する。
 * 一時保存して、圧縮して名前を変更して、再保存。
 * ブラウザを再起動する。
 *
*/
gulp.task('sass', () => {
  gulp.src(srcPath.sassPath + '/**/*.scss')
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(sass({
      config_file: 'config.rb',
      sass: srcPath.sassPath,
      css: srcPath.cssPath,
      image: srcPath.imgPath
    }))
    //.pipe(frontnote({ out: srcPath.cssPath }))
    .pipe(autoprefixer({
      browsers: ['last 2 version', 'iOS >= 8.1', 'Android >= 4.4.4'],
      cascade: false
    }))
    .pipe(csscomb())
    .pipe(gulp.dest(distPath.cssPath + '/'))
    .pipe(cssmin())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(distPath.cssPath + '/'))
    .pipe(browser.reload({ stream: true }))
    .pipe(notify('css task finished'));
});


/**
 * JavaScript task
 *
 *
 * Check the script with ESLint.
 * Compile the ES 2015 notation to ES 5 with babel, save it after renaming.
 * Join scripts in the order specified by JSON and save them.
 * Compress the combined script, output the source map and save.
* Reload the browser.
 *
 * ESLintでスクリプトをチェックする。
 * babelでES2015記法をES5にコンパイルしてリネーム後、保存する。
 * JSONで指定した順番にスクリプトを結合して保存する。
 * 結合したスクリプトを圧縮し、ソースマップを出力して保存。
 * ブラウザを再起動する。
 *
*/
let jsJson = JSON.parse(fs.readFileSync(srcPath.jsPath + '/order.json')),
    jsList = [],
    cutLength;
for (let i = 0; i < jsJson.order.length; i++) {
  jsList[i] = srcPath.jsPath + jsJson.order[i];
}
//
gulp.task('js.babel', () => {
  return gulp.src(srcPath.jsPath + '/**/*babel.js')
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(eslint({useEslintrc: true}))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(babel())
    .pipe(rename(function (Path) {
       cutLength = Path.basename.length - 6;
       Path.basename = Path.basename.slice(0, cutLength);
    }))
    .pipe(gulp.dest(srcPath.jsPath + '/babel/'))
});
gulp.task('js.concat', () => {
  return gulp.src(jsList.join(',').split(','))
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(concat('index.js'))
    .pipe(gulp.dest(distPath.jsPath + '/'))
});

gulp.task('js.uglify', () => {
  return gulp.src(distPath.jsPath + '/index.js')
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(sourcemaps.init())
    .pipe(uglify({preserveComments: 'some'}))
    .pipe(sourcemaps.write())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(distPath.jsPath + '/'))
    .pipe(browser.reload({ stream: true }))
    .pipe(notify('js task finished'));
});
//
gulp.task('js', function(callback) {
  gulpSequence('js.babel', 'js.concat', 'js.uglify')(callback)
});


/**
 *
 * Create common objects that can be used within ejs.
 * Change the extension to html.
 * Compress and save html.
 * Reload the browser.
 *
 * ejs内で利用出来る共通のオブジェクトを作成。
 * htmlに拡張子を変更する。
 * htmlを圧縮して保存。
 * ブラウザを再起動する。
 *
*/
gulp.task('ejs.init', () => {
  return gulp.src([srcDir + '/**/*.ejs','!' + srcDir + '/**/*_*.ejs'])
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(ejs({data: JSON.parse(fs.readFileSync(srcDir + '/common/' + 'data.json'))}))
    //.pipe(minifyHtml())
    .pipe(rename({extname: '.html'}))
    .pipe(gulp.dest(distDir + '/'))
    .pipe(notify('html task finished'));
});
//
gulp.task('ejs.reload', ['ejs.init'], () => {
  return browser.reload();
});
//
gulp.task('ejs', ['ejs.init', 'ejs.reload']);


/**
 *
 * Compress and save the image.
 * Reload the browser.
 *
 * 画像を圧縮して保存。
 * ブラウザを再起動する。
 *
*/
gulp.task('images.min', () => {
  return gulp.src(srcPath.imgPath + '/**/*.{png,jpg,gif,svg}')
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>')}))
    //.pipe(cache( imagemin( [pngquant({quality: '60-80', speed: 1})] )))
    .pipe(gulp.dest(distPath.imgPath + '/'))
});
//
gulp.task('images.reload', ['images.min'], () => {
  return browser.reload();
});
//
gulp.task('images', ['images.min', 'images.reload']);


/**
 * dafault task
 *
*/
gulp.task('default', ['browser'], () => {
  watch([srcPath.jsPath + '/**/*.js', '!' + srcPath.jsPath + '/babel/**/*.js'], () => { gulp.start(['js']) });
  watch([srcPath.sassPath + '/**/*.scss'], () => { gulp.start(['sass']) });
  watch([srcDir + '/**/*.ejs'], () => { gulp.start(['ejs']) });
  watch([srcPath.imgPath + '/**/*.{png,jpg,gif,svg}'], () => { gulp.start(['images']) });
});


/**
 * Clean up the file for release
 *
*/
gulp.task('copy', () => {
  gulp.src(distDir + '/**/*')
    .pipe(gulp.dest('release/01'));
});

gulp.task('delete', () => {
  gulp.src('release/01')
    del(['release/**/*.LCK', 'release/**/*_notes', 'release/**/Templates/']);
});
