var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    del = require('del'),
    rename = require('gulp-rename'),
    banner = require('gulp-banner'),
    eslint = require('gulp-eslint'),
    path = require('path'),
    exec = require('child_process').execSync,
    pkg = require('./package.json');

var src = 'src',
    demo = 'demo',
    build = 'build',
    dist = 'dist',
    static = 'static',
    pages = 'pages',
    environment = 3;

var staticPath = path.join(build, static);

var comment = '';

//clean
gulp.task('clean', function() {
    del.sync(build);
    del.sync(dist);
});

//js
gulp.task('js', function() {
    var target = path.join(dist),
        source = [path.join(src, '**/' + pkg.name + '.js')];

    var stream = gulp.src(source);

    stream = stream.pipe(banner(comment, {
        pkg: pkg
    }));

    //output unmin
    stream = stream.pipe(gulp.dest(target));

    //min
    environment && (stream = stream.pipe(uglify()));

    //rename
    stream = stream.pipe(rename(function(path) {
        path.basename += '.min';
    }));

    stream = stream.pipe(banner(comment, {
        pkg: pkg
    }));

    //output min
    stream = stream.pipe(gulp.dest(target));

    //output build
    stream = stream.pipe(rename(function(path) {
        path.basename = 'index';
    }));

    return stream.pipe(gulp.dest(staticPath));
});

//html
gulp.task('html', function() {
    var source = [path.join(demo , '**/*.html')],
        target = path.join(build, pages);

    var stream = gulp.src(source);

    return stream.pipe(gulp.dest(target));
});

//eslint
gulp.task('eslint', function() {
    var source = [path.join(src, '**/*.js')];
    return gulp.src(source)
        .pipe(eslint())
        .pipe(eslint.format());
});

//只生成文档
//docker -i src -o build/pages/docs

//监听文档并生成文档
//docker -i src -o build/pages/docs -w
gulp.task('docs', function(cb) {
    var target = path.join(build, 'pages/docs', 'v' + pkg.version),
        source = path.join(src);
    try {
        exec('docker -i ' + source + ' -o ' + target);
        cb();
    } catch (e) {
        console.log(e.message);
        process.exit(0);
    }
});

gulp.task('default', ['clean'], function() {
    var tasks = environment == 3 ? ['js'] : ['js','html'];

    gulp.start.apply(gulp, tasks);
});

gulp.task('watch', function() {
    var source = [path.join(src , '**/*.js')];

    environment = 0;
    gulp.start('default');

    gulp.watch(source, function() {
        gulp.start('js');
    });

    source = [path.join(demo , '**/*.html')];
    gulp.watch(source, function() {
        gulp.start('html');
    });
});
