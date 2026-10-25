const { withAppBuildGradle } = require('@expo/config-plugins');

// Credentials come from the build environment; never fall back to the public
// debug key for release artifacts. Debug builds remain usable without secrets.
const signing = `
    signingConfigs {
        release {
            if (System.getenv('MINDLOG_KEYSTORE_PATH')) {
                storeFile file(System.getenv('MINDLOG_KEYSTORE_PATH'))
                storePassword System.getenv('MINDLOG_KEYSTORE_PASSWORD')
                keyAlias System.getenv('MINDLOG_KEY_ALIAS')
                keyPassword System.getenv('MINDLOG_KEY_PASSWORD')
            }
        }
    }
    gradle.taskGraph.whenReady { graph ->
        if (graph.allTasks.any { it.project == project && it.name.toLowerCase().contains('release') }) {
            ['MINDLOG_KEYSTORE_PATH', 'MINDLOG_KEYSTORE_PASSWORD', 'MINDLOG_KEY_ALIAS', 'MINDLOG_KEY_PASSWORD'].each { key ->
                if (!System.getenv(key)) throw new GradleException('Release signing requires ' + key)
            }
        }
    }
`;

function configureReleaseSigning(source) {
  if (source.includes('Release signing requires')) return source;
  const release = /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!release.test(source)) throw new Error('Could not find the generated release signing configuration. Review the Gradle template.');
  return source.replace(release, '$1signingConfig signingConfigs.release').replace('android {', `android {\n${signing}`);
}

module.exports = config => withAppBuildGradle(config, mod => {
  mod.modResults.contents = configureReleaseSigning(mod.modResults.contents);
  return mod;
});
module.exports.configureReleaseSigning = configureReleaseSigning;
