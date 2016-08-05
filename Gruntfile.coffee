module.exports = (grunt) ->
  # load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)

  # load package config
  pkg = grunt.file.readJSON('package.json')

  # load dist config
  config = grunt.file.readYAML('project.yml')

  taskConfig =
    nodemon:
      options:
        args: ['development']
        nodeArgs: ['--debug=5851']
        watch: [
          'app'
          'bin'
        ]
        legacyWatch: true

      # nodemon.server
      server:
        script: 'bin/server.js'
        options:
          callback: (nodemon) ->
            nodemon.on 'log', (evt) ->
              console.log evt.colour

            nodemon.on 'restart', () ->
              console.log 'restart server.'

    # inspector for debugging
    'node-inspector':
      dev:
        options:
          'save-live-edit': true

    # open browser for inspector
    open:
      dev:
        path: 'http://127.0.0.1:8080/debug?port=5851'

    concurrent:
      options:
        logConcurrentOutput: true
      server:
        tasks: [
          'nodemon:server'
          'node-inspector:dev'
        ]

  # add shell config
  taskConfig.shell =
    options:
      stdout: true
      async: false

  for env of config.host
    host = "ubuntu@" + config.host[env]

    for target of config.bin
      for task in ['dist']
        id = [env, task].join('-')

        taskConfig.shell[id] =
          command: [
            "rsync -avz -e \"ssh\" --exclude-from '.distignore' --exclude='.git/' --chmod='a=r,u+w,D+x' ./ ubuntu@" + config.host[env] + ":/home/ubuntu/" + config.path
          ].join('&&')

        grunt.registerTask id, ['shell:' + id]

      for task in ['start']
        id = [env, target, task].join('-')

        taskConfig.shell[id] =
          command: [
            "ssh " + host +
            " \"source ~/.bash_profile && pm2 " + task + " " + config.path + config.bin[target] + " -i 0 --name " + config.name + "\""
          ].join('&&')

        grunt.registerTask id, ['shell:' + id]

      for task in ['stop', 'reload']
        id = [env, target, task].join('-')

        taskConfig.shell[id] =
          command: [
            "ssh " + host +
            " \"source ~/.bash_profile && pm2 " + task + " " + config.name + "\""
          ].join('&&')

        grunt.registerTask id, ['shell:' + id]

      for task in ['config']
        id = [env, task].join('-')
        command = []

        for filename of config.config
          source = config.config[filename].replace '{host}', env
          command.push [
            "cat conf/" + source,
            "ssh " + host + " 'cat > " + config.path + 'conf/' + filename + "'"
          ].join ' | '

        taskConfig.shell[id] =
          command: command.join '&&'

        grunt.registerTask id, ['shell:' + id]


  grunt.initConfig taskConfig

  # grunt.loadNpmTasks('grunt-nodemon')
  # register task
  # grunt.registerTask 'default', () ->
  #   grunt.task.run [
  #     'concurrent:server'
  #   ]

  grunt.registerTask 'default', () ->
    grunt.task.run [
      'nodemon'
    ]

  grunt.registerTask 'debug', () ->
    grunt.task.run [
      'concurrent:server'
    ]
