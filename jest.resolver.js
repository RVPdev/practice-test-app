// Jest's `resolver` option only accepts one module. react-native's own preset
// installs a resolver (to keep `react-native` subpath mocking working under
// Jest per RFC0894), and react-native-worklets ships a second one (to force
// its Jest-safe, non-".native" files instead of the real native module -
// otherwise requiring react-native-reanimated under Jest crashes trying to
// load a native turbo module that doesn't exist in the test environment).
// Compose both instead of picking one, since they touch independent parts of
// the resolve options (packageFilter vs. extensions) and don't conflict.
module.exports = (request, options) => {
  const { defaultResolver, packageFilter: originalPackageFilter } = options;

  const packageFilter = (pkg) => {
    const filtered = originalPackageFilter ? originalPackageFilter(pkg) : pkg;
    // Temporarily allow any react-native subpaths to be resolved and mocked
    // by Jest (backwards compatibility around RFC0894).
    if (filtered.name === 'react-native') {
      delete filtered.exports;
    }
    return filtered;
  };

  let extensions = options.extensions;
  if (options.basedir.includes('react-native-worklets') || request.includes('react-native-worklets')) {
    extensions = extensions?.filter((ext) => !ext.includes('native'));
  }

  return defaultResolver(request, { ...options, packageFilter, extensions });
};
