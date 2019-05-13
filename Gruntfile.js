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
                    }
                ]
            },
            fontAwesome:{ //place fonts in the right relatively linked directory
                files:[
                    {
                        expand: true,
                    cwd: '<%= paths.dist %>/libs/components-font-awesome/',
                    src: ['fa-*'],
                    dest: '<%= paths.dist %>/libs/webfonts'
                    }
                ]
            },
            licenses:{ //place fonts in the right relatively linked directory
                files:[
                    {
                        expand: true,
                    cwd: 'ThirdPartyLicenses/',
                    src: ['releaseLICENSES'],
                    dest: '<%= paths.dist %>/licenses'
                    }
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
        },
        express: {
            web: {
                options: {
                    port: 8080,
                    script: '<%= paths.dist %>/js/server.js',
                    background: true,
                }
            }
        },
        license: {
            options: {
                // Task-specific options go here.
            },
            your_target: {
                // Target-specific file lists and/or options go here.
            },
        },
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
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-license');

    // Default task(s).
    grunt.registerTask('default', ['clean', 'bower:install', 'less:live', 'copy']);
    grunt.registerTask('release', ['clean','bower:install', 'less:live', 'copy']);
    grunt.registerTask('run', ['clean','bower:install', 'less:dev', 'copy', 'connect', 'watch']);
    grunt.registerTask('server', ['express:web', 'watch']);

};