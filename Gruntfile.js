module.exports = function(grunt) {


    var pathConfig = {
        src: 'src',
        build: 'build',
        dist: 'www'
    };

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        paths: pathConfig,

        clean: {
            build: {
                src: ['www/*']
            }
        },

        less: {
            dev: {
                options: {
                    cleancss: false,
                    compress: false,
                    sourceMap: true,
                    outputSourceFiles: true
                },
                files: {
                    'www/css/custom.css': 'src/less/custom.less',
                    'www/css/normalize.css': 'src/less/normalize.less',
                }
            },
            live: {
                options: {
                    cleancss: true,
                    compress: true,
                    sourceMap: false
                },
                files: {
                    'www/css/custom.css': 'src/less/custom.less',
                    'www/css/normalize.css': 'src/less/normalize.less',
                }
            }
        },

        copy: {
            for_www: {
                files: [
                    {
                        expand: true,
                        cwd: 'src/',
                        src: ['css/*','img/*','js/main.js', 'index.html'],
                        dest: 'www'
                    },
                ]
            }
        },

        uglify: {
            libs: {
                options: {
                    sourceMap: false,
                    sourceMapIncludeSources: true
                },
                files: {
                    'www/js/libs.min.js': [
                        'src/js/vendor/modernizr-3.5.0.min.js',
                        'src/js/vendor/knockout-3.4.2.js',
                        'src/js/vendor/i18next-ko.bundle.js',
                        'src/js/vendor/jquery-3.2.1.min.js'
                    ]
                }
            }
        },

        watch: {
            options: {
                spawn: false,
                livereload: true
            },
            less: {
                files: [
                    'src/less/**',
                    '!src/less/*.map'
                ],
                tasks: ['less:dev']
            }
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');



    // Default task(s).
    grunt.registerTask('default', ['clean', 'less:live','uglify:libs', 'copy:for_www']);
    grunt.registerTask('run', ['clean', 'less:dev','uglify:libs', 'copy:for_www', 'watch']);

};