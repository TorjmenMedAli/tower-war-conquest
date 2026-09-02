Pod::Spec.new do |s|
  s.name = 'TdsGamecenter'
  s.version = '1.0.0'
  s.summary = 'Game Center bridge (leaderboards + achievements) for Tower Destiny Survive'
  s.license = { :type => 'MIT' }
  s.homepage = 'https://github.com/local/tds-gamecenter'
  s.author = 'TDS'
  s.source = { :path => '.' }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m}'
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
  s.frameworks = 'GameKit'
end
