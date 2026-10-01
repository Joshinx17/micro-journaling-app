const { withGradleProperties } = require('@expo/config-plugins');

// Applied on every Expo prebuild; the generated android/ tree is intentionally ignored.
module.exports = config => withGradleProperties(config, mod => {
  const settings = {
    'android.enableMinifyInReleaseBuilds': 'true',
    'android.enableShrinkResourcesInReleaseBuilds': 'true',
    'expo.gif.enabled': 'false',
    'expo.webp.enabled': 'false',
  };
  for (const [key, value] of Object.entries(settings)) {
    const property = mod.modResults.find(item => item.type === 'property' && item.key === key);
    if (property) property.value = value;
    else mod.modResults.push({ type: 'property', key, value });
  }
  return mod;
});
