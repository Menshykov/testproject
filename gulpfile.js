var gulp = require('gulp');
var gulpif = require('gulp-if');
var plumber = require('gulp-plumber');
var filter = require('gulp-filter');
var pugInheritance = require('yellfy-pug-inheritance');
var pug = require('gulp-pug');
var sourcemaps = require('gulp-sourcemaps');
var stylus = require('gulp-stylus');
var browserSync = require('browser-sync').create();
var nib = require('nib');
var cleanCSS = require('gulp-clean-css');
var minify = require('gulp-minify');
var concat = require('gulp-concat');
const autoprefixer = require('gulp-autoprefixer');

var public = 'dist';
var src = 'resources/src';

var reload = browserSync.reload;
// Компилятор Стилей
gulp.task('stylus', function() {
  return gulp.src(src+'/css/*.styl')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(stylus({
      use: [nib()],
      'include css': true,
      compress: true
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(src+'/css/plugins/'))
    .pipe(browserSync.stream());
});

gulp.task('minify-css', function() {
    return gulp.src([
        src+'/css/plugins/main.css'
    ])
        .pipe(autoprefixer({
            browsers: ["last 8 version", "> 1%", "ie 8"],
            cascade: false
        }))
        .pipe(concat('main.min.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest(public+'/css/'));
});

gulp.task('concat-js', function() {
    return gulp.src([
        src+'/js/layout.js'
    ])
        .pipe(concat('main.js'))
        .pipe(gulp.dest(src+'/js/main/'))
});

gulp.task('minify-js', function() {
    return gulp.src(src+'/js/main/main.js')
        .pipe(minify({
            ext:{
                source: '',
                min:'.min.js'
            }
        }))
        .pipe(gulp.dest(public+'/js/'))
        .pipe(browserSync.stream());
});

let pugInheritanceCache = {};
// Watch Task
gulp.task('watch', () => {
    global.watch = true;
    browserSync.init([public+'/css/*.css', public+'/*.html'], {
        server: "./"+public+"/"
    });
    gulp.watch([src+'/css/**/*.styl'], gulp.series('stylus', 'minify-css'));
    gulp.watch([src+'/pug/**/*.pug'], gulp.series('pug'))
        .on('all', (event, filepath) => {
        global.changedTempalteFile = filepath.replace(/\\/g, '/');
    });
    gulp.watch([src+'/js/*.js'], gulp.series('concat-js', 'minify-js'));
    gulp.watch(public+"/*.html").on("change", reload);
});
// Генерация Pug проверка того что изменилось
function pugFilter(file, inheritance) {
    const filepath = src+`/pug/${file.relative}`;
    if (inheritance.checkDependency(filepath, global.changedTempalteFile)) {
        console.log(`Compiling: ${filepath}`);
        return true;
    }
    return false;
}

// Генерация Pug
gulp.task('pug', () => {
    return new Promise((resolve, reject) => {
        const changedFile = global.changedTempalteFile;
        const options = {
            changedFile,
            treeCache: pugInheritanceCache
        };

        pugInheritance.updateTree(src+'/pug', options).then((inheritance) => {
            // Save cache for secondary compilationswatch
            pugInheritanceCache = inheritance.tree;

            return gulp.src(src+'/pug/*.pug')
                .pipe(gulpif(global.watch, filter((file) => pugFilter(file, inheritance))))
                .pipe(plumber())
                .pipe(pug({ pretty: true }))
                .pipe(gulp.dest(public))
                .on('error', console.log)
                .on('end', resolve);
        });
    });
});

gulp.task('default', gulp.series('pug', 'stylus', 'minify-css', 'concat-js', 'minify-js', 'watch'));

gulp.task('dist', gulp.series('pug', 'stylus', 'minify-css', 'concat-js', 'minify-js'));