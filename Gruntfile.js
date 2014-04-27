module.exports = function( grunt ) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        
        clean: ['build/*'],

        jshint: {
            options: {
                eqeqeq: true,
                indent: 4,
                latedef: true,
                quotmark: 'single',
                undef: true,
                unused: true,
                maxdepth: 2,
                sub: true,
                maxlen: 120,
                node: true,
                reporterOutput: 'build/syntax',
            },
            files: {
                src: ['lib/*.js']
            }
        },

        mochaTest: {
            options: {
                reporter: 'spec',
                ui: 'tdd'
            },
            src: ['test/*.js']
        }

    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('syntax', ['clean', 'jshint']);
    grunt.registerTask('test', ['mochaTest']);
    grunt.registerTask('default', ['clean', 'jshint', 'mochaTest']);

};
