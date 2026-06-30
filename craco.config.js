const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'app/backend/frontend/src'),
    },
    configure: (webpackConfig) => {
      // 1. Remove ModuleScopePlugin so @-aliased imports from
      //    app/backend/frontend/src/ are allowed (CRA blocks cross-src imports)
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
      );

      // 2. Allow babel-loader to process .js/.jsx files in app/backend/frontend/src/
      //    (CRA's default include only covers the local src/ directory)
      const appBackendSrc = path.resolve(__dirname, 'app/backend/frontend/src');
      webpackConfig.module.rules.forEach((rule) => {
        if (rule.oneOf) {
          rule.oneOf.forEach((oneOfRule) => {
            if (
              oneOfRule.loader &&
              oneOfRule.loader.includes('babel-loader') &&
              oneOfRule.include
            ) {
              // Extend include to cover the actual frontend source directory
              if (Array.isArray(oneOfRule.include)) {
                oneOfRule.include.push(appBackendSrc);
              } else {
                oneOfRule.include = [oneOfRule.include, appBackendSrc];
              }
            }
          });
        }
      });

      return webpackConfig;
    },
  },
  style: {
    postcssOptions: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
};
