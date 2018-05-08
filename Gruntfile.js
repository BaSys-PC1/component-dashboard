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

        connect: {
            server: {
                options: {
                    hostname: '*',
                    port: 9001,
                    base: 'www',
                    livereload: true
                }
            }
        },

        clean: {
            build: {
                src: ['<%= paths.dist %>/*']
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
                    '<%= paths.dist %>/css/custom.css': '<%= paths.src %>/less/custom.less',
                }
            },
            live: {
                options: {
                    cleancss: true,
                    compress: true,
                    sourceMap: false
                },
                files: {
                    '<%= paths.dist %>/css/custom.css': '<%= paths.src %>/less/custom.less',
                }
            }
        },

        copy: {
            for_www: {
                files: [
                    {
                        expand: true,
                        cwd: '<%= paths.src %>/',
                        src: ['css/*','img/*','data/*','fonts/*','js/*', 'index.html'],
                        dest: '<%= paths.dist %>'
                    },
                ]
            }
        },

        bower: {
            install: {
                options: {
                    layout: 'byType',
                    targetDir: '<%= paths.dist %>/libs',
                    copy: true,
                    cleanup: true
                }
            }
        },
        wiredep: {
            task: {
                src: [
                    '<%= paths.dist %>/index.html',
                ],
                options: {
                    directory:'<%= paths.dist %>/libs/*',
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
                    '<%= paths.src %>/less/**',
                    '!<%= paths.src %>/less/*.map'
                ],
                tasks: ['less:dev']
            },
            html: {
                files: [
                    '<%= paths.src %>/index.html',
                    '<%= paths.src %>/js/*'
                ],
                tasks: ['copy:for_www']
            }
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-wiredep');


    // Default task(s).
    grunt.registerTask('default', ['clean', 'bower:install', 'less:live', 'copy:for_www']);
    grunt.registerTask('release', ['clean','bower:install', 'less:live', 'copy:for_www']);
    grunt.registerTask('run', ['clean','bower:install', 'less:dev', 'copy:for_www', 'connect', 'watch']);

};